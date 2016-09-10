module.exports = function($httpProvider) {
	console.log("ghfjsklgf");

    var interceptor = ['$q',
        function($q) {
            return {
                'request': function(config) {
                    if (config.method == 'POST' || config.method == 'PUT') {
                    	if (config.data && config.data.__proto__.transform) {
		                    return config.data.__proto__.transform(config);
		                }
                    }

                	return config;
                }
            }
        }
	];

    $httpProvider.interceptors.push(interceptor);
}