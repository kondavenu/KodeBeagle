$(document).bind( 'keydown', function( e ) {
  if( e.ctrlKey || e.shiftKey ) {
    return;
  }
  if( e.target.nodeName.toLowerCase() === 'input' || e.target.nodeName.toLowerCase() === 'textarea' ) {
    return;
  }
  var keyCode = e.which;
  var key = String.fromCharCode( keyCode );
  if( key.search( /[a-zA-Z]/i ) !== -1 ) {
      if( $('#searchText' ).is( ':visible' ) ) {
        $('#searchText' ).focus();
      } else if( $( '#searchCode' ).is( ':visible' ) ) {
        $('#searchCode' ).focus();
      }
      window.scrollTo(0, 0);
  }
} );

(function( module ) {
	module.directive('searchComponent', function() {
    return {
      controller: 'searchController',
      templateUrl: 'search-component.html'
    };
  })
  .controller('searchController', [
    '$scope',
    '$rootScope',
    'model',
    '$location',
    'http',
    function(
      $scope,
      $rootScope,
      model,
      $location,
      http
    ) {

      $scope.model = model;
      model.selectedTexts = model.selectedTexts || [];
      $scope.handleSelectedText = function(e, i) {
        
        e.preventDefault();
        var spliceData = model.selectedTexts.splice( i, 1 );
        if (model.searchText) {
          model.selectedTexts.push(model.searchText);
        }
        model.searchText = spliceData[0];
        
      };
      
      $scope.deleteItem = function(e, i) {
        
        e.preventDefault();
        model.selectedTexts.splice(i, 1);
      
      };

      $scope.changeSearchType = function($event,searchType){
        $event.preventDefault();
        var langConstants = model.langConstants;
        if(searchType === 'keyword'){
          model.isCode = false;
          model.searchOptions.searchTypes = [langConstants.JAVA,langConstants.JAVA_SCRIPT,langConstants.SCALA];
        }else if(searchType === 'snippet'){
          model.isCode = true;
          model.selectedTexts=[]
          model.searchOptions.searchTypes = [langConstants.JAVA,langConstants.SCALA];
        }
      }
      
      $scope.formSubmit = function(forceSubmit) {
        
        //$scope.showRequiredMsg = false;
        if( !model.isCode) {
          if ( model.searchText ) {
            var type = {
              "term": model.searchText,
              "type": "word"
            };
            model.selectedTexts.push(type);
            model.searchText = '';
          }

          var searchTerm = JSON.stringify(model.selectedTexts);
          var searchType = model.searchOptions.selectedSearchType;
          if ( searchTerm ) {
            if( model.searchPage && Object.keys($location.search()).length) {
              var search = $location.search();
              search.searchTerms = searchTerm;
              search.searchType = searchType;
              $location.search( search );
              model.filterSelected = false;
              $rootScope.editorView = true;
            } else {
              window.location = 'search/#?searchTerms=' + searchTerm+'&searchType='+searchType;
            }
            

          }  
        } else {

          KB.parseCodeSnippet( {url:basepath + 'library/data/java_lang_pkg.json',textSelected:model.searchCode}, function  ( searchTerm ) {
            if( model.searchPage ) { 
              var search = $location.search();
              search.searchTerms = searchTerm;
              $location.search( search );
              model.searchCode = ''; 
            } else {
              window.location = 'search/#?searchTerms=' + searchTerm;
            }
            
          } )
          
        }
         
      };

      $scope.clearAll = function(e) {
        
        e.preventDefault();
        model.selectedTexts = [];
        model.searchText = '';
        model.searchCode = '';
      };


      function doGetCaretPosition(ctrl) {
        
        var CaretPos = 0; // IE Support
        if ( document.selection ) {
          ctrl.focus();
          var Sel = document.selection.createRange();
          Sel.moveStart('character', -ctrl.value.length);
          CaretPos = Sel.text.length;
        }
        // Firefox support
        else if (ctrl.selectionStart || ctrl.selectionStart === '0')
          CaretPos = ctrl.selectionStart;
        return (CaretPos);

      }

      $scope.handleSearchText = function(e) {
        var type = {};
        /*on press of tab( 9 keycode ) and if model.searchText present the create a new search term*/
        if ( e.keyCode === 9 && model.searchText ) {
            type = {
              "term": model.searchText,
              "type": "word"
            };
            model.selectedTexts.push(type);
            model.searchText = '';
            $scope.isOpen = false;
            e.preventDefault();
            return false;
        }

        /*on press of space( 32 keycode ) or comma( 188 keycode ) then create the new search term with model.searchText */
        if ( e.keyCode === 32 || e.keyCode === 188 ) {
          if (model.searchText) {
            type = {
              "term": model.searchText,
              "type": "word"
            };
            model.selectedTexts.push(type);
            $scope.isOpen = false;
            model.searchText = '';
          }
          e.preventDefault();
          return false;
        }

        /*on press backspace and dont have any text in the textbox*/
        if ( doGetCaretPosition(e.target) === 0 && e.keyCode === 8 ) {
          model.selectedTexts.pop();
          $scope.searchTypes = [];
          $scope.isOpen = false;
          return;
        }

        $scope.getTypeText();
      };

      $scope.getTypeText = function() {
        if ($scope.searchText === model.searchText) {
          return;
        }
        $scope.searchText = model.searchText;
        return http.get(model.config.esURL + "/suggest?text=" + model.searchText)
        .then(function(res) {
          var types = [];
          if (res) {
            res.types.forEach(function(eachObj){
              types.push({type:'type', term: eachObj.text});
            });
            res.props.forEach(function(eachObj){
              types.push({type:'method', term: eachObj.payload.type+'.'+eachObj.text+'()'});
            });
          }
          $scope.searchTypes = types;
          $scope.isOpen = (types.length > 0);
        });
      };

      $scope.selectMatch = function(index) {
        model.selectedTexts.push($scope.searchTypes[index]);
        $scope.isOpen = false;
        model.searchText = '';
      };
    }
  ])
} )( KB.module )