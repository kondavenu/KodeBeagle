(function(angular) {
  var requestCounter = 0;
  var processRequest = function(state) {
    if (state) {
      requestCounter++;
      angular.element(document.getElementById('request-loader')).addClass('show');
    } else {
      requestCounter--;
      if (requestCounter <= 0) {
        requestCounter = 0;
        angular.element(document.getElementById('request-loader')).removeClass('show');
      }
    }
  };
  angular.module('httpSerivice', [])
    .config(['$httpProvider', function($httpProvider) {
      // Override $http service's default transformRequest
      $httpProvider.defaults.transformRequest = [function(data) {
        //console.log( 'all requests will go through this even and this is final' ) ;
        return data;
      }];
      $httpProvider.defaults.headers.common = {};
      $httpProvider.defaults.headers.post = {};
      $httpProvider.defaults.headers.put = {};
      $httpProvider.defaults.headers.patch = {};
      $httpProvider.interceptors.push(function($q) {
        return {
          request: function(config) {
            processRequest(true);
            //console.log( 'all requests will go through this..' );
            return config;
          },
          requestError: function(response) {
            processRequest(false);
            //console.log( 'all requestError will go through this..' );
            return $q.reject(response);
          },
          response: function(response) {
            processRequest(false);
            //console.log( 'all response will go through this..' );
            return response;
          },
          responseError: function(response, status) {
            processRequest(false);
            //console.log( 'all responseError will go through this..' );
            return $q.reject(response);
          },
        };
      });
    }])
    .factory('http', [
      '$http',
      '$q',
      function(
        $http,
        $q
      ) {
        return {
          get: function(url) {
            var defer = $q.defer();
            //console.log( 'get call' );
            $http.get(url)
              .success(function(response) {
                //console.log( 'inside success' );
                defer.resolve(response);
              })
              .error(function(err, status) {
                if (status === 0) {
                  err = {
                    message: 'The server is temporarily unable to service your request due to maintenance downtime or capacity problems. Please try again later.'
                  };
                }
                defer.reject(err);
              });
            return defer.promise;
          },
          post: function(url, data) {
            var defer = $q.defer();
            //console.log( 'post call' );
            $http.post(url, data)
              .success(function(response, success) {
                //console.log( 'inside success' );
                defer.resolve(response, success);
              })
              .error(function(data, status) {
                defer.reject(data, status);
              });
            return defer.promise;
          }
        };
      }
    ]);
})(angular);
