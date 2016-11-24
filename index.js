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
            if (status == 200 || status == 201) {
                response = angular.fromJson(response);

                total = response.total;
                prototype = this.object.prototype;

                if (angular.isArray(response.data)) {
                    for (var i = response.data.length - 1; i >= 0; i--) {
                        response.data[i] = this.object.apply(response.data[i], this.dependancies);
                    }
                } else {
                    response.data = this.object.apply(response.data, this.dependancies);
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

                if (resourceObject) {
                    globals[resourceKey] = null;
                }

                for (var i = 0; i < dependancies.length; i++) {
                    if (typeof dependancies[i] == 'string') {
                        if (!globals.hasOwnProperty(dependancies[i])) {
                            globals[dependancies[i]] = $injector.get(dependancies[i]);
                        }

                        dependancies[i] = globals[dependancies[i]];
                    }
                };

                angular.forEach(actions, function(action, key) {

                    // action.cancellable = true;

                    if (resourceObject) {
                        var responseTransformer = new ResponseTransformer;

                        action.transformResponse = responseTransformer.bind({
                            object: resourceObject,
                            dependancies: dependancies,
                            key: resourceKey
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

                    return (data) ? angular.extend(new Resource(), resourceObject.apply(data, dependancies)) : resource;
                }

                angular.extend(constructor, Resource);

                if (resourceObject) {
                    globals[resourceKey] = constructor;
                }

                    angular.forEach(dependancies, function(value, key) {
                        if (value == null) {
                            dependancies[key] = constructor;                            
                        }
                    })

                return constructor;
            }

            service.apiUrl = defaults.url;

            return service;
        }
    }
});