module.exports = function($httpProvider) {
    $httpProvider.interceptors.push(function($q, $injector) {
        return {
            'request': function(config) {
                if (config.method == 'POST' || config.method == 'PUT') {

                    if (config.data) {
                        var deferred = $q.defer(),
                            promises = [];

                        // TODO: Allow for a promise response
                        for (var prop in config.data) {
                            if (angular.isArray(config.data[prop])) {
                                for (var i = 0; i < config.data[prop].length; i++) {
                                    if (config.data[prop][i].__proto__.transform) {
                                        (function(data) {
                                            promises.push($q.when($injector.invoke(data.__proto__.transform, data)));
                                        })(config.data[prop][i]);
                                    }
                                }
                            } else if (config.data[prop] && config.data[prop].__proto__ && config.data[prop].__proto__.transform) {
                                (function(data) {
                                    promises.push($q.when($injector.invoke(data.__proto__.transform, data)));
                                })(config.data[prop]);
                            }
                        }

                        if (config.data.__proto__.transform) {
                
                            config.data = angular.copy(config.data);

                            var promise = $q.when($injector.invoke(config.data.__proto__.transform, config.data)).$promise;

                            if (promise) {
                                promises.push(promise);
                            }
                        }

                        $q.all(promises).then(function() {
                            deferred.resolve(config);
                        })

                        return deferred.promise;
                    }
                }

                return config;
            }
        }
    })
}