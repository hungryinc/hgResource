module.exports = function($httpProvider) {
    $httpProvider.interceptors.push(function($q, $injector) {
        return {
            'request': function(config) {
                if (config.method == 'POST' || config.method == 'PUT') {
                    if (config.data && config.data.__proto__.transform) {
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

                return config;
            }
        }
    });
}