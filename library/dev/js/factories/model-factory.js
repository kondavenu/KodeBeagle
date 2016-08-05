(function( module ) {
  module.factory('model', [ '$location','SEARCH_TYPES', function( $location,SEARCH_TYPES ) {
    var data = {};

    if( localStorage.getObject ) {
      var esURL = 'http://labs.imaginea.com/kodebeagle';
      data.showConfig = $location.search().advanced;
      data.pageResultSize=10;
      data.toggelSnippet = true;
      data.searchPage = true;
      data.config = localStorage.getObject('config') || {
        selectedTheme: 'theme-light',
        esURL: esURL,
        resultSize: 50,
        offset: 2
      };

      data.config.esURL = data.config.esURL || esURL;
      data.config.resultSize = data.config.resultSize || 50;

      if( typeof data.config.offset === 'undefined' ) {
          data.config.offset = 2;
      }
    }

    var parse = function(value){
      return JSON.parse(value);
    };
    var stringify = function(value){
      return JSON.stringify(value);
    };

    var activeTab = $location.search().activeTab || 'files';
    data.tab = {};
    data.sessionStorage = {};
    data.tab[ activeTab ] = true;
    data.langConstants = SEARCH_TYPES;
    data.searchOptions = {
      langType:'java',
      selectedSearchType : SEARCH_TYPES.JAVA,
      searchTypes : [SEARCH_TYPES.JAVA,SEARCH_TYPES.JAVA_SCRIPT,SEARCH_TYPES.SCALA]
    }

    data.sessionStorage.setValue = function(key,value){
      sessionStorage.setItem(key,stringify(value));
    },
    data.sessionStorage.getValue = function(key){
      return parse(sessionStorage.getItem(key));
    },
    data.sessionStorage.deleteValue = function(key){
        sessionStorage.removeItem(key);
    }

    return data;
  }]
);
})( KB.module )
