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
        var request = createGETRequest('should',search.path,'fileName');
        
        http.get(model.config.esURL + "/filemetadata/typefilemetadata/_search?source="+request)
        .then( function( res ) {
            $scope.item = {};
            $scope.item.repository = res.hits.hits[0]._source.repository;
            $scope.item.files = res.hits.hits[ 0 ]._source.files;
            $scope.item.terms = res.hits.hits[0]._source.terms;
        }, function( err ) {
            console.log( err );
        } );


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