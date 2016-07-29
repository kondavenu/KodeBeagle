(function() {
  var app = angular.module( 'FileExplorer', [ 'KodeBeagleFileExplore'] );
  app.controller( 'explorerController', [
    '$scope',
    '$location',
    'model',
    'http',
    function(
        $scope,
        $location,
        model,
        http
    ) {
        var search = $location.search();
        var queryBody = {
              'query': {
                'bool': {
                  'should' : [{'term':{'fileName':search.filename}}]
                }
              }
            };
        var url = model.config.esURL
                  + '/sourcefile/_search?size=50'
                  + '&source='+ JSON.stringify(queryBody);

        http.get(url)
        .then(fileSource)
        .then(getMetaInfo)
        .then(processMetaInfo);

        function fileSource(res) {
          $scope.fileInfo = res.hits.hits[0]._source;
        }

        function getMetaInfo() {
          var request = createGETRequest('should',search.filename,'fileName');
          return http.get(model.config.esURL + "/filemetadata/typefilemetadata/_search?source="+request);
        }

        function processMetaInfo(res) {

        }

        function createGETRequest(boolKey,fileName,termKey){
            var req = {};
            req.query = {};
            req.query.bool = {};
            var term = {};
            term[termKey] = fileName;
            req.query.bool[boolKey] = [{'term':term}];
            return JSON.stringify(req);
        }
    }
  ]);

  angular.bootstrap( document, [ 'FileExplorer' ] );
})();