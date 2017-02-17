module.exports = function($httpProvider) {
    $httpProvider.interceptors.push(function($q, $injector) {
        return {
            'request': function(config) {
                if (config.method == 'POST' || config.method == 'PUT') {

                    if (config.data) {

                        // TODO: Allow for a promise response
                        for (var prop in config.data) {
                            if (angular.isArray(config.data[prop])) {
                                for (var i = 0; i < config.data[prop].length; i++) {
                                    if (config.data[prop][i].__proto__.transform) {
                                        config.data[prop][i] = $injector.invoke(config.data[prop][i].__proto__.transform, config.data[prop][i]);
                                    }
                                }
                            }
                        }

                        if (config.data.__proto__.transform) {
                            var deferred = $q.defer();
                
                            config.data = angular.copy(config.data);

                            $q.when($injector.invoke(config.data.__proto__.transform, config), function() {
                                deferred.resolve(config);
                            }, function() {
                                 deferred.reject();
                            });

                            return deferred.promise;
                        }
                    }
                }

                return config;
            }
        }
    })
}