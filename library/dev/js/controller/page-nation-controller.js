( function( module ) {
	
	module.controller( 'pageNationCtrl', [
    '$scope',
    'model',
    'docsService',
    function(
      $scope,
      model,
      docsService
    ) {
      
      $scope.getRange = function() {
        
        var arr = [];
        var totalPages = Math.ceil( model.totalFiles / model.pageResultSize );
        model.totalPages = totalPages;
        var from = model.currentPageNo - Math.floor(model.pageResultSize/2) ;
        
        if( from <= 0 ) {
          from = 1;
        }

        var to = from + model.pageResultSize;
        if( to > totalPages ) {
          from = from - ( to - totalPages );
          if( from <= 0 ) {
            from = 1;
          }
          to = totalPages;
        }
        for( ; from <= to ; from++ ) {
          arr.push( from );
        }
        return arr;

      };
      
      $scope.loadPageResult = function( e, pageNo ) {
        
        e.preventDefault();
        if(model.currentPageNo ===  pageNo-1 ) {
          return;
        }
        window.scrollTo(0, 0);
        model.currentPageNo = pageNo - 1;
        docsService.searchRequest(model.selectedTexts);
        //KB.updateEditorsList( docsService.getData( 'processedData' ).result,  model.packages, model, docsService );

      }

      $scope.loadPrev = function( e, cond ) {
        
        e.preventDefault();
        if( cond ) {
          model.currentPageNo--;
          docsService.searchRequest(model.selectedTexts);
          //KB.updateEditorsList( docsService.getData( 'processedData' ).result,  model.packages, model, docsService );
        }

      }

      $scope.loadNext = function( e, cond ) {
        
        e.preventDefault();
        if( cond ) {
          model.currentPageNo++;
          docsService.searchRequest(model.selectedTexts);
          //KB.updateEditorsList( docsService.getData( 'processedData' ).result,  model.packages, model, docsService );
        }

      }
      
    }
  ] );

} )( KB.module )