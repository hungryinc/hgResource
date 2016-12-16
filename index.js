require('angular-resource');

angular.module('hgResource', [
    'ngResource'
])

.config(require('./intercepter'))

.provider('Resource', function($resourceProvider) {

    var defaults = $resourceProvider.defaults;

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

            if (status == 200 || status == 201) {
                response = angular.fromJson(response);

                total = response.total;
                prototype = this.factory.prototype;

                if (angular.isArray(response.data)) {
                    for (var i = response.data.length - 1; i >= 0; i--) {
                        $injector.invoke(this.factory, response.data[i]);
                    }
                } else {
                    $injector.invoke(this.factory, response.data);
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

            var service = function(endpoint, paramDefaults, factory, actions, config) {
                actions = angular.extend({}, defaults.actions, actions);

                angular.forEach(actions, function(action, key) {

                    if (factory) {
                        var responseTransformer = new ResponseTransformer;

                        action.transformResponse = responseTransformer.bind({
                            factory: factory,
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
                    angular.extend(Resource.prototype, factory.prototype);

                    return (data) ? angular.extend(new Resource(), $injector.invoke(factory, data)) : new Resource();
                }

                return angular.extend(constructor, Resource);
            }

            service.apiUrl = defaults.url;

            return service;
        }
    }
});