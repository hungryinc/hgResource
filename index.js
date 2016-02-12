require('angular-resource');

angular.module('hgResource', [
    'ngResource'
])

.provider('Resource', function($resourceProvider) {

    var defaults = $resourceProvider.defaults;

    var globals = {};

    // Add $update method to all resources
    defaults.actions.update = {
        method: 'PUT',
    }

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
                return false;
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
                    var resourceObject = resource[resourceKey][resource[resourceKey].length -1];
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
                        if ( ! globals.hasOwnProperty(dependancies[i])) {
                            globals[dependancies[i]] = $injector.get(dependancies[i]);
                        }

                        dependancies[i] = globals[dependancies[i]];
                    }
                };

                angular.forEach(actions, function(action, key) {

                    if (resourceObject) {
                        var responseTransformer = new ResponseTransformer;

                        action.transformResponse = responseTransformer.bind({
                            object: resourceObject,
                            dependancies: dependancies,
                            key: resourceKey
                        });

                        if (resourceObject.prototype.transform && (action.method == 'POST' || action.method == 'PUT')) {
                            action.transformRequest = resourceObject.prototype.transform;
                        }

                        if ( ! action.interceptor) {
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

                var Resource = $resource((defaults.url || '') + endpoint, paramDefaults, angular.copy(actions));

                angular.forEach(dependancies, function(value, key) {
                    if (value == null) {
                        dependancies[key] = Resource;
                    }
                })

                var constructor = function(data) {
                    angular.extend(Resource.prototype, resourceObject.prototype);

                    return (data) ? angular.extend(new Resource(), resourceObject.apply(data, dependancies)) : resource;
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