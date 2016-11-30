require('angular-resource');

angular.module('hgResource', [
    'ngResource'
])

.config(require('./intercepter'))

.provider('Resource', function($resourceProvider) {

    var defaults = $resourceProvider.defaults;

    var globals = {};

    // Add $update method to all resources
    defaults.actions.update = {
        method: 'PUT',
    }

    var domainPattern = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/

    var ResponseTransformer = function() {
        var total = null;
        var prototype;

        var transformer = function(response, headersGetter, status) {
            var $injector = this.$injector;

            var dependancies = this.dependancies.map(function(dependancy) {
                return $injector.get(dependancy);
            })

            if (status == 200 || status == 201) {
                response = angular.fromJson(response);

                total = response.total;
                prototype = this.object.prototype;

                if (angular.isArray(response.data)) {
                    for (var i = response.data.length - 1; i >= 0; i--) {
                        response.data[i] = this.object.apply(response.data[i], dependancies);
                    }
                } else {
                    response.data = this.object.apply(response.data, dependancies);
                }

                return response.data;
            } else {
                try {
                    return angular.fromJson(response);
                } catch (e) {
                    return response;
                }
            }
        }

        transformer.getTotal = function() {
            return total;
        }

        transformer.getPrototype = function() {
            return prototype;
        }

        return transformer;
    }

    return {

        setApiUrl: function(url) {
            defaults.url = url;
        },

        getApiUrl: function() {
            return defaults.url;
        },

        $get: function($resource, $injector) {

            var service = function(endpoint, paramDefaults, resource, actions, config) {
                actions = angular.extend({}, defaults.actions, actions);

                var resourceKey = Object.keys(resource)[0];

                if (angular.isArray(resource[resourceKey])) {
                    var resourceObject = resource[resourceKey][resource[resourceKey].length - 1];
                    var dependancies = resource[resourceKey].slice(0, -1);
                } else {
                    var resourceObject = resource[resourceKey];
                    var dependancies = [];
                }

                angular.forEach(actions, function(action, key) {

                    if (resourceObject) {
                        var responseTransformer = new ResponseTransformer;

                        action.transformResponse = responseTransformer.bind({
                            object: resourceObject,
                            dependancies: dependancies,
                            key: resourceKey,
                            $injector: $injector,
                        });

                        if (!action.interceptor) {
                            action.interceptor = {}
                        }

                        action.interceptor.response = function(response) {
                            angular.extend(Resource.prototype, responseTransformer.getPrototype());

                            if (angular.isArray(response.data)) {
                                angular.forEach(response.data, function(value, i) {
                                    response.data[i] = new Resource(value);
                                });

                                response.data.total = responseTransformer.getTotal();
                            } else {
                                response.data = new Resource(response.data);
                            }

                            return response.data;
                        }
                    }

                    actions[key] = angular.extend({}, action, config);
                })

                if (!domainPattern.test(endpoint)) {
                    endpoint = (defaults.url || '') + endpoint;
                }

                var Resource = $resource(endpoint, paramDefaults, angular.copy(actions));

                var constructor = function(data) {
                    angular.extend(Resource.prototype, resourceObject.prototype);

                    deps = dependancies.map(function(dependancy) {
                        return $injector.get(dependancy);
                    });

                    return (data) ? angular.extend(new Resource(), resourceObject.apply(data, deps)) : resource;
                }

                if (resourceObject) {
                    globals[resourceKey] = angular.extend(constructor, Resource);
                }

                return angular.extend(constructor, Resource);
            }

            service.apiUrl = defaults.url;

            return service;
        }
    }
});