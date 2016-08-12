(function( module ) {
  var processedData={};
  module.directive('initModel', [
    'model',
    '$location',
    '$rootScope',
    'docsService',
    '$document',
    'http',
    function(model, $location, $rootScope, docsService, $document, http) {


      docsService.config(model.config);

      var backTotop = angular.element( document.getElementById( 'back-to-top' ) )
      var navEle = angular.element( document.getElementById( 'header-nav' ) );
      var bodyEle = angular.element( document.body );
      var prevScrollTop;

      $document.bind( 'scroll', function( e ) {
        var topOffset = document.body.scrollTop;
        if( topOffset > 5 ) {
          backTotop.addClass( 'show' );

        } else {
          backTotop.removeClass( 'show' );
          navEle[0].style.top = '';
          bodyEle.removeClass( 'stick-to-top' );
          return;
        }

        if( prevScrollTop > topOffset ) {
          bodyEle.addClass( 'stick-to-top' );

          setTimeout( function  () {
            navEle[0].style.top = '0px';
          }, 10 );

        } else {
          navEle[0].style.top = '';
          setTimeout( function  () {
            bodyEle.removeClass( 'stick-to-top' );
          }, 100 );
        }


        prevScrollTop = topOffset;
      } );

      backTotop.bind( 'click', function( e ) {
        e.preventDefault();
        window.scrollTo(0, 0);
      } )

      return {
        controller: ['$scope', '$rootScope', function(scope, $rootScope) {

          scope.model = model;
          scope.$watch(function() {
            return $location.search().searchTerms + $location.search().searchType;
          }, function(params) {
            model.currentPageNo = 0;
            var queryParams = $location.search();
            var selectedTexts = JSON.parse(queryParams.searchTerms);
            model.repos = false;
            model.selectedTexts = [];
            $rootScope.editorView = false;
            model.showErrorMsg = false;

            if (selectedTexts) {
              model.selectedTexts = selectedTexts;
              model.searchedData = _.pluck(model.selectedTexts, 'term').join(', ');
              model.searchOptions.selectedSearchType = queryParams.searchType;
              if(model.searchOptions.selectedSearchType === model.langConstants.JAVA_SCRIPT){
                model.searchOptions.langType = 'js';
              }
              else{
                model.searchOptions.langType = 'java'
              }
              model.showPageResponse = true;
              $rootScope.editorView = true;
              docsService.searchRequest(model.selectedTexts);
              
              /*docsService.search( {
                queryString: selectedTexts,
                callback: function( obj ) {
                  model.showErrorMsg = false;
                  if( obj.status === 'error' ) {
                    model.showErrorMsg = true;
                    model.errorMsg = obj.result.message;
                    return false;
                  }
                  model.totalHitCount = obj.totalHitCount;
                  model.hitCount = obj.result.length;
                  model.showPageResponse = true;
                  var groupedata= docsService.groupByFilename( obj.result );
                  processedData = docsService.groupByImportsAndFile( {
                    data: groupedata,
                    searchString: obj.correctedQuery
                  } );
                  docsService.setData( 'processedData', processedData );
                  processedData.result = _.sortBy(processedData.result, function(elem) {
                    return -elem.fileMatchingImports.methodCount;
                  });
                  model.emptyResponse = false;
                  model.groupedMethods = _.values( processedData.classes );
                  model.groupedMethods = _.remove( model.groupedMethods, function ( ele ) {
                    return( ele.methods.length );
                  } );

                    //to sort methods in import besed on the number of their occurrences
                    var matchedImportMethodsCount = {};
                    _.each(processedData.result, function(value, key){
                        _.each(value.matchedImportMethodsCount, function(methodsCount, importName){
                            if( importName !== 'methodCount' ) {
                                if(!matchedImportMethodsCount[importName]) {
                                    matchedImportMethodsCount[importName] = {};
                                }
                                _.each(methodsCount, function(count, methodName){
                                    if(!matchedImportMethodsCount[importName][methodName]){
                                        matchedImportMethodsCount[importName][methodName] = 0;
                                    }
                                    matchedImportMethodsCount[importName][methodName] += count;
                                });
                            }
                        })
                    });

                  for (var cName in processedData.classes ) {
                    processedData.classes[cName].methods = _.unique(processedData.classes[cName].methods);
                    //searchCommonUsage(cName, processedData.classes[cName]);
                  }

                    //to sort methods in import besed on the number of their occurrences
                  _.each(model.groupedMethods, function(importName, index){
                      var sortedMethods = _.sortBy(importName.methods, function(methodName){
                          var count = matchedImportMethodsCount[importName.importName][methodName];
                          if(count != 0)
                              return -count;
                          return 0;
                      });
                      importName.methods = sortedMethods;
                  });

                  if (processedData.result.length === 0) {

                    model.emptyResponse = true;
                    model.totalFiles = 0;
                    function getCombinations(chars) {
                      var result = [];
                      var f = function(prefix, chars) {
                        var r;
                        for (var i = 0; i < chars.length; i++) {
                          r = prefix ? prefix + ',' + chars[i] : chars[i] ;
                          result.push( r );
                          f( r, chars.slice(i + 1));
                        }
                      }
                      f('', chars);
                      return result;
                    }

                    var combinations = getCombinations(model.selectedTexts);
                    model.suggestions = [];
                    for( var i=0; i< combinations.length; i++ ) {
                      docsService.search( {
                        queryString: combinations[ i ],
                        resultSize: 1,
                        callback: function( obj ) {

                          if( obj.result.length ) {
                            model.suggestions.push( obj.query );
                          }
                        },

                      } );
                    }

                    //docsService.updateSuggesions( combinations );
                  } else {
                    KB.updateEditorsList( processedData.result, model.packages, model, docsService );
                  }

                }
              } );*/
              document.getElementById( 'searchText' ) && document.getElementById( 'searchText' ).blur();
              model.isCode = false;
              model.packages = false;

            }
          });

          scope.$watch(function() {
            return $location.search().filter;
          }, function( newval, oldval ) {

            model.currentPageNo = 0;
            if( !newval ) {
              newval = '{}';
              model.packages = false;
            } else {
              model.packages = JSON.parse(newval);
            }
            if( newval || oldval ) {
              KB.updateEditorsList( processedData.result, model.packages, model,  docsService );
            }

          });
        }]
      };
    }
  ]);
} )( KB.module )
