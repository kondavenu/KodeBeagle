
( function( kb ) {

  window.KB  = kb;
  var fileContents = {};

  kb.updateEditorsList = function  ( data, pkgs, model, docs ) {


    model.expandedItem = false;
    
    var editors = model.editors;
    model.editors = [];

    var result = docs.getFilteredFiles( data, pkgs );

    files = result && result.slice( 
      model.currentPageNo * model.pageResultSize,
      model.currentPageNo * model.pageResultSize + model.pageResultSize 
    );

    _.each( files, function ( x ) {
      docs.updatedLineNumbers( x, pkgs );
    } );
    model.totalFiles = result.length;
    var filterdFiles = angular.copy(files);

    if( files && files.length ) {
      
      model.filterNotFound = false;      
      for( var i=0, cnt = 0; i < files.length ; i++, cnt++ ) {
        var fileCntnt = fileContents[ files[ i ].path ];
        if( fileCntnt ) {
          model.editors[ cnt ] = docs.splitFileContent( fileCntnt, files[ i ], model.config.offset || 2 );
          files.splice( i, 1 );
          i--;
        }
      }

      if( files.length === 0 ) {
        return;
      }

      docs.renderFileContent( files, function ( response ) {
        
        for( var i=0 ; i < filterdFiles.length; i++ ) {
          
          var index = _.findIndex( response.result, function( el ) {

            return el._source.fileName === filterdFiles[i].path;

          } );
          
          if( index !== -1 ) {

            fileContents[ response.result[ index ]._source.fileName ] = response.result[ index ]._source.fileContent;
            model.editors[ i ] = docs.splitFileContent( response.result[ index ]._source.fileContent, filterdFiles[ i ], model.config.offset || 2 );

          }

          
        }

      } );

    }

  }

} )( window.KB || {} );
