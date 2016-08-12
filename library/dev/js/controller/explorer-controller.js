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
        /*fileMetaInfo is metadata received from Kodebeagle server,
            fileMetadata is parsed and converted to lineMetaInfo that is a 
            map from lineNumber to all types information*/

        var lineMetaInfo = {}, fileMetaInfo = {};

        /*linesMeta & filesMeta is meta information stored in session object of external files 
            we get from KodeBeagle server being called on each type reference click*/

        var linesMeta = {},filesMeta = {};
        var loader;
        var fileName = document.location.search.split('?filename=')[1];

        init();

        function init() {
          var queryBody = sourceRequest();
          var url = model.config.esURL
                    + '/source'
                    + '?file='+ fileName;
          //basepath +"library/data/source.txt"
          http.get(url)
          .then(fileSource);
        }
        
        function fileSource(res) {
          $scope.fileInfo = {
            fileName: fileName,
            fileContent: res
          }
          setTimeout(()=>addColumnNumbers(),10);
        }

        function getMetaInfo() {
          if(model.sessionStorage.getValue('linesMeta') && model.sessionStorage.getValue('linesMeta')[fileName]){
            fileMetaInfo = model.sessionStorage.getValue('filesMeta')[fileName];
            lineMetaInfo = model.sessionStorage.getValue('linesMeta')[fileName];
            navigateToSelection(fileMetaInfo);
            highliteReferences(lineMetaInfo);

            model.sessionStorage.deleteValue("filesMeta");
            model.sessionStorage.deleteValue("linesMeta");
          } else {
            var request = createGETRequest('should',fileName,'fileName');
            var url = model.config.esURL + "/metadata?file="+fileName;
            //basepath +"library/data/meta.json"
            http.get(url)
            .then(processMetaInfo);
          }
        }

        function processMetaInfo(response) {
          var metadata = response;
          if(metadata){
            navigateToSelection(metadata);
            parseFileMetadata(metadata);
            fileMetaInfo = filesMeta[fileName];
            lineMetaInfo = linesMeta[fileName];
            highliteReferences(lineMetaInfo);
          }
        }

        function sourceRequest() {
          var queryBody = {
                'query': {
                  'bool': {
                    'should' : [{'term':{'fileName':fileName}}]
                  }
                }
              };
          return queryBody;
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

        function columnCount(text){
          if(!text){
            return 0;
          }

          var colCount = 0;
          var arrTexts = text.split(' ');
          for(var eachIndex=0;eachIndex<arrTexts.length;eachIndex++){
            if(arrTexts[eachIndex]){
                break;
            }
            colCount++;
          } 
          return colCount;
        }

        function addColumnNumbers(){

          $('.eachrow').each(function(rowIndex){
            var colCount = 0;
            $(this).find('span').each(function(index){
              if(index === 0 && $(this).text().trim()){
                  var doc = document.createDocumentFragment(), 
                      text = $(this).text(), spaces = columnCount(text);
                  
                  if(spaces > 0){
                      var emptySpan = document.createElement('span');
                      emptySpan.innerHTML = text.substr(0,spaces);
                      doc.appendChild(emptySpan);
                      $(doc).insertBefore(this);
                      colCount += spaces;
                      $(this).text(text.substr(spaces,text.length));     
                  }
                  $(this).attr('data-column-number', colCount);
                  colCount += text.length - spaces;
              }
              else {
                $(this).attr('data-column-number', colCount);
                colCount += $(this).text().length;
              }
              
              if(this.nextSibling){
                var text = this.nextSibling.innerHTML;
                var spaces = columnCount(text);
                spaces = text.trim().length>0 ?spaces:0;
                colCount += spaces;
              }
            });
          });
          getMetaInfo();
        }

        /*Navigate to method selection from session storage*/

        function navigateToSelection(fileMetadata){
          if(model.sessionStorage.getValue('methodInfo')){
            fileMetadata.methodDefinitionList.some(function(methodDef) {
              var sessionMethodInfo = model.sessionStorage.getValue('methodInfo');
              if(isMethodDefEqual(methodDef,sessionMethodInfo)){
                var lineInfo = methodDef.loc;
                scrollAndSelect(lineInfo);
              }
            });
            model.sessionStorage.deleteValue("methodInfo");
          }
        }

        /*Check if method definations are equal based on name, arguments & argument types*/

        function isMethodDefEqual(methodDef1,methodDef2){
          if(methodDef1.method !== methodDef2.method){
            return false;
          }else if (methodDef1.argTypes.length !== methodDef2.argTypes.length) {
            return false;
          }else{
            for(var i = 0; i < methodDef2.argTypes.length; i++) {
                if(methodDef1.argTypes[i] !== methodDef2.argTypes[i])
                    return false;
            }
            return true;
          }
        }

        /*Converts meta data from KodeBeagle endpoint to lines of meta information 
            for each github file visited*/

        function parseFileMetadata(metaData) {
          linesMeta = {},filesMeta = {};
          var hits = metaData;
          hits.forEach(function(eachHit){
            var lineMetadata = {};
            function getParentRef(methodType){
              var methodDefList = eachHit.methodDefinitionList,parentRef;
              for(var index = 0;index<methodDefList.length;index++){
                var methodDef = methodDefList[index];
                if(isMethodDefEqual(methodDef,methodType)){
                  parentRef = methodDef.loc;
                  break;
                }
              }
              return parentRef;
            }
            function setChildRefs(methodDef){
              var matchFound = false;
              eachHit.methodTypeLocation.forEach(function(methodType){
                if(isMethodDefEqual(methodDef,methodType)){
                  matchFound = true;
                  var typeInfo = methodDef.loc.split("#");
                  if(!lineMetadata[typeInfo[0]])
                      lineMetadata[typeInfo[0]] = [];
                  methodType.type = "internalRef";
                  methodType.childLine = methodType.loc;
                  methodType.parentLine = methodDef.loc;
                  lineMetadata[typeInfo[0]].push(methodType);
                }
              });
              if(matchFound){
                var typeInfo = methodDef.loc.split("#");
                methodDef.type = "internalRef";
                methodDef.childLine = methodDef.loc;
                methodDef.parentLine = methodDef.loc;
                lineMetadata[typeInfo[0]].push(methodDef);
              }
            }
            eachHit.methodDefinitionList.forEach(function(methodDef){
              //setChildRefs(methodDef);
            });
            /*eachHit.typeLocationList.forEach(function(typeLocation){
              var lineInfo = typeLocation.loc.split("#");
              if(!lineMetadata[lineInfo[0]])
                  lineMetadata[lineInfo[0]] = [];
              typeLocation.type = "typeLocation";
              lineMetadata[lineInfo[0]].push(typeLocation);
            });
            eachHit.methodTypeLocation.forEach(function(methodType){
              var typeInfo = methodType.loc.split("#");
              if(!lineMetadata[typeInfo[0]])
                lineMetadata[typeInfo[0]] = [];
              if(methodType.id === -1){ 
                var parentRef = getParentRef(methodType);
                if(parentRef){
                    methodType.type = "internalRef";
                    methodType.childLine = methodType.loc;
                    methodType.parentLine = parentRef;
                    lineMetadata[typeInfo[0]].push(methodType);
                }else{
                    methodType.type = "methodType";
                    lineMetadata[typeInfo[0]].push(methodType);    
                }
              }else{
                methodType.type = "methodType";
                lineMetadata[typeInfo[0]].push(methodType);
              }
            });*/
            eachHit.externalRefList.forEach(function(external){
              external.vars.forEach(function(eachVar){
                external.type = 'externalRefType';
                if(!lineMetadata[eachVar[0]])
                  lineMetadata[eachVar[0]] = [];
                lineMetadata[eachVar[0]].push(external);
              });

              external.methods.forEach(function(method){
                external.type = 'externalRefMethod';
                method.loc.forEach(function(eachLoc){
                  if(!lineMetadata[eachLoc[0]])
                    lineMetadata[eachLoc[0]] = [];
                  lineMetadata[eachLoc[0]].push(external);  
                });
              });
            });
            eachHit.internalRefList.forEach(function(internalRef, index){
              internalRef.type = "internalRefChild";
              internalRef.c.forEach(function(ref){
                if(!lineMetadata[ref[0]])
                  lineMetadata[ref[0]] = [];
                lineMetadata[ref[0]].push(internalRef);
              });
              var parent = angular.copy(internalRef);
              if(parent.p && parent.p.length > 0 ) {
                if(!lineMetadata[parent.p[0]])
                  lineMetadata[parent.p[0]] = [];
                parent.type = "internalRefParent";
                lineMetadata[parent.p[0]].push(parent);
              }
            });
            linesMeta[eachHit.fileName] = lineMetadata;
            filesMeta[eachHit.fileName] = eachHit;
          }); 
          model.sessionStorage.setValue('linesMeta',linesMeta);
          model.sessionStorage.setValue('filesMeta',filesMeta);
        }

        /*Adds the css style to code based on lines meta information*/

        function highliteReferences(lineMetadata){
          for(var eachLine in lineMetadata){
            lineMetadata[eachLine].forEach(function(eachColumn){
              if(eachColumn.type === 'internalRefChild'){
                eachColumn.c.forEach(function(eachColumn){
                  createLinks(eachColumn);
                });
              } else if(eachColumn.type === 'internalRefParent'){
                createLinks(eachColumn.p);
              } else if (eachColumn.type === 'externalRefMethod') {
                  eachColumn.methods.forEach(function(method){
                    createLinks(method.loc[0]);  
                  });
              } else if (eachColumn.type === 'externalRefType') {
                  eachColumn.vars.forEach(function(eachVar){
                    createLinks(eachVar);  
                  });
              }
              else{
                createLinks(eachColumn.loc.split('#'));
              }
            });
          }
        }

        function createLinksForImports(){    
          $('.blob-code-inner').each(function(rowIndex){
            if($(this).find('.pl-k').text() === 'import')
              $(this).find('.pl-smi').addClass('referenced-links');
          });
        }

        function createLinks(lineInfo){
          var element = $("li[data-line-number="+ lineInfo[0] +"]").find("span[data-column-number="+lineInfo[1]+"]")[0];
          $(element).addClass('referenced-links');
        }

        /*Fetches the child references for each type references with in the file*/

        function getChildLines(lineMeta){
          var references = [];
          for(var eachLine in lineMetaInfo){
            lineMetaInfo[eachLine].forEach(function(eachObj){
              if(eachObj.type === 'internalRef'){
                var childLine = eachObj.childLine.split('#');
                var child = eachObj.parentLine.split('#');
                if(lineMeta[0] === child[0] && lineMeta[1] === child[1] && childLine[0] != child[0]){
                  references.push(eachObj.childLine);
                }
              }
            });
          }
          return references;
        }

        function closePopUp(){
          var elements = document.getElementsByClassName("links-box");
          while (elements[0]) {
            elements[0].parentNode.removeChild(elements[0]);
          }
        }

        $scope.getMatchedTypes = function(event) {
          closePopUp();
          
          var target = $(event.target).hasClass('referenced-links')?event.target:$(event.target.parentNode).hasClass('referenced-links')?event.target.parentNode:null;
          if(target) {
            clearBoldLinks();
            /*if($($(target).siblings()[0]).text() === 'import'){
                var source = target.innerText;
                getMatchedSourceFiles(source, event);
                return;
            }*/

            var lineNumber = target.parentNode.attributes["data-line-number"].value,
                  lineMeta = lineMetaInfo[lineNumber], sourceFile = "";

            if(!lineMeta)
              return;
            
            lineMeta.some(function(typeInfo){
              if(typeInfo.type == "typeLocation") {
                var typeId = typeInfo.id, typeLocs = typeInfo.loc.split('#'),
                    columnValue = target.attributes['data-column-number'];

                if(columnValue && columnValue.value == typeLocs[1].trim()){
                  fileMetaInfo._source.externalRefList.some(function(externalRef){
                    if(externalRef.id === typeId) {
                      sourceFile = externalRef.fqt;
                      return true;
                    }
                  });
                  return true;
                }
              }
              if(typeInfo.type == "methodType") {
                var typeId = typeInfo.id, typeLocs = typeInfo.loc.split('#'),
                    columnValue = target.attributes['data-column-number'];

                if(columnValue && columnValue.value == typeLocs[1].trim()){ 
                  fileMetaInfo._source.externalRefList.some(function(externalRef){
                    if(externalRef.id === typeId) {
                      sourceFile = externalRef.fqt;
                      model.sessionStorage.setValue('methodInfo',typeInfo);
                      return true;
                    }
                  });
                  return true;
                }
              }

              if(typeInfo.type == "externalRefType") {
                var typeVars = typeInfo.vars;
                    columnValue = target.attributes['data-column-number'];

                typeVars.forEach(function(eachVar){
                  if(columnValue && columnValue.value == eachVar[1]){ 
                    sourceFile = typeInfo.fqt;
                    return true;
                  }
                });
              }

              if(typeInfo.type == "externalRefMethod") {
                var methods = typeInfo.methods;
                    columnValue = target.attributes['data-column-number'];

                methods.forEach(function(method){
                  method.loc.forEach(function(eachLoc){
                    if(columnValue && columnValue.value == eachLoc[1]){ 
                      sourceFile = typeInfo.fqt;
                      model.sessionStorage.setValue('methodInfo',method);
                      return true;
                    }
                  });
                });
              }

              if(typeInfo.type == "internalRefChild") {
                var lineInfo = typeInfo.p, childLinesInfo = typeInfo.c,
                    columnValue = target.attributes['data-column-number'].value;                

                childLinesInfo.forEach(function(childLine){
                  if(columnValue == childLine[1] && childLine[0] != lineInfo[0]){    
                    scrollAndSelect(lineInfo,target);
                    return true;
                  }
                });
              }

              if(typeInfo.type == 'internalRefParent') {
                var childLines = typeInfo.c, internalReferences = [];
                childLines.forEach(function(eachLine){
                  var line = eachLine,refereceObj = {}, 
                      child = $("li[data-line-number="+line[0]+"]"),
                      codeSnippet = child.text().trim(),
                      selectedText = target.innerHTML.trim();
                  codeSnippet = codeSnippet.replace(selectedText,"<b>"+selectedText+"</b>");
                  createBoldLink(child,selectedText);
                  refereceObj.snippet = codeSnippet;
                  refereceObj.references = eachLine;
                  internalReferences.push(refereceObj);
                });
                showInternalReferences(internalReferences,{left:event.pageX, top:event.pageY+10});
                return true;
              }
            });

            if(sourceFile) {
              //sourceFile = sourceFile.replace(/\./g, "/");
              sourceFile = sourceFile.replace(/\[\]/g, "");
              getMatchedSourceFiles(sourceFile, event);
            }
          }
        }

        function createBoldLink(child,selectedText){
          $(child).find('.referenced-links').each(function(){
              this.innerHTML = $(this).text().replace(selectedText,"<b>"+selectedText+"</b>");
          });
        }

        function clearBoldLinks(){
          $('.referenced-links b').each(function(){
              $(this).contents().unwrap();
          });
        }

        function scrollAndSelect(lineInfo,target){
          var rowEle = $("li[data-line-number="+ lineInfo[0] +"]"),element;
          $('html,body').animate({
              scrollTop: rowEle.offset().top - 20
          }, 500);
          selectRow(rowEle);
          element = rowEle.find("span[data-column-number="+lineInfo[1]+"]")[0];
          selectText(element);
        }

        function selectRow(rowEle){
          $('.select-row-color').removeClass('select-row-color');
          rowEle.addClass('select-row-color');
        }

        function selectText(element){
          if(element){
            var selection = window.getSelection(),range = document.createRange();
            range.selectNodeContents(element);
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }

        function getMatchedSourceFiles(sourceFile, event) {
          var request = createGETRequest('must',sourceFile,'fileTypes.fileType');
          var url = model.config.esURL + "/metadata?type="+sourceFile;
          http.get(url)
          .then(function(response) {
            hideLoader(event);
            var extRes = response;
            showDropDown(extRes, {left:event.pageX, top:event.pageY+10});
            parseFileMetadata(extRes);
          });
        }

        function hideLoader(event){
          $('.reference-loader').remove();    
        }

        var showLoader = function(event){
          event.target.parentNode.appendChild(loader);
        };

        function showInternalReferences(internalReferences, position) {
          var div = createInternalRefDiv(internalReferences);
          document.body.insertBefore(div, document.body.firstChild);
          $(div).offset(position);
        }

        function showDropDown(matchedSourceFiles, position) {
          var div = createExternalRefDiv(matchedSourceFiles);
          document.body.insertBefore(div, document.body.firstChild);
          $(div).offset(position);
        }

        function createExternalRefDiv(matchedSourceFiles) {
          var doc = document.createDocumentFragment(), div = document.createElement ("div");
          div.className = "links-box";
          if(matchedSourceFiles.length === 0){
            var span = document.createElement("span");
            span.className = 'external-ref';
            span.textContent = "Couldn't find external references";
            doc.appendChild(span);
          }else{
            matchedSourceFiles.forEach(function(sourceFile) {
              var a = document.createElement("a");
              a.className = 'external-ref';
              a.textContent = sourceFile.fileName;
              a.href = "./../explore?filename="+sourceFile.fileName;
              doc.appendChild(a);
            });
          }
          div.appendChild(doc);
          return div;
        }

        function gotoLine(event){
          var lineInfo = event.currentTarget.attributes['data-line-info'].value;
          closePopUp();
          scrollAndSelect(lineInfo.split(','));
        }

        function createInternalRefDiv(references) {
          var doc = document.createDocumentFragment(), mainDiv = document.createElement("div");
          mainDiv.className = "links-box";
          
          if(references.length === 0){
            var span = document.createElement("span");
            span.className = 'external-ref';
            span.textContent = "Couldn't find external/internal references";
            doc.appendChild(span);
          }else{
            var references = references.sort(function(ref1,ref2){
              return ref1.references[0] > ref2.references[0];
            });
            references.forEach(function(lineInfo) {
              //var template = "<div onclick=gotoLine(event)><span>"+lineDetails[0]+":"+lineDetails[1]+"</span><span data-line-info="+lineInfo.references+">"+lineInfo.snippet+"</span></div"
              var lineDetails = lineInfo.references,
                  div = document.createElement("div");
              div.setAttribute('data-line-info',lineInfo.references);
              div.onclick = gotoLine;
              var lineSpan = document.createElement("span");
              lineSpan.style.width = '80px';
              lineSpan.textContent = lineDetails[0]+":"+lineDetails[1];
              div.appendChild(lineSpan);
              var textSpan = document.createElement("span");
              textSpan.innerHTML = lineInfo.snippet;
              div.appendChild(textSpan);
              doc.appendChild(div);
            });
          }
          mainDiv.appendChild(doc);
          return mainDiv;
        }

        var cloneLoader = function(){
          loader = $('.page-context-loader').clone().addClass('reference-loader')[0];
        };
    }
  ]);

  angular.bootstrap( document, [ 'FileExplorer' ] );
})();