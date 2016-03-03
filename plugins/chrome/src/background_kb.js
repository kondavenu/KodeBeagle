//Chrome supports 4 types of contexts - selection,page,image,link
//for our requirement we like the context menu to be enabled only on text selection.
var contextMenuTitle = "Search on KodeBeagle";

chrome.contextMenus.create({
  title: contextMenuTitle,
  contexts: ["selection"],
  onclick: evalFunction
});

// We don't want the search to consider java.lang classes. 
// This object will be initialized with external JSON file named java_lang_pkg.json
// This contains all the elements which would be eliminated.
var javaLangPkg = {};

function evalFunction(data) {
  var textSelected = data.selectionText,
    // Replace all special characters with spaces. 
    // Any character other than A-Z or a-z or 0-9 will be replaced by a blank
    clearedSelection = textSelected.replace(/(\"[^\"]*\")/g,'').replace(/[^a-zA-Z0-9_]/g, ' ').split(' '),
    //regex to select only camelcase words    
    regexPattern = new RegExp("^[A-Z]([A-Za-z])+");

  // Load external JSON file named java_lang_pkg.json
  loadJSON(function(response) {
    javaLangPkg = JSON.parse(response);
  });

  var searchTextArray = [];
  clearedSelection.forEach(function(keyword) {
    if (regexPattern.test(keyword) && searchTextArray.indexOf(keyword) === -1 && javaLangPkg[keyword.toLowerCase()] !== true) {
      searchTextArray.push(keyword);
    }
  })

  if (searchTextArray.length === 0) {
    alert('No keywords found in current selection. You may expand your selection, to include more lines.');
    return;
  }

  //append ',' by iterating through each element of the array to make it a final search string
  //Eg: if we have array as FilterChannel and Filter then extract the array to a string variable 
  //as finalSearchStr = FilterChannel,Filter;
  var search = searchTextArray.reduce(function(acc, val) {
    return acc + "," + val
  });
  var fileExt = 'java';

  chrome.tabs.create({
    url: "http://kodebeagle.com/search/#?searchTerms=" + search+"&searchType="+fileExt
  });
}

function loadJSON(callback) {
  var xobj = new XMLHttpRequest();
  xobj.overrideMimeType("application/json");
  xobj.open('GET', 'java_lang_pkg.json', false);
  xobj.onreadystatechange = function() {
    if (xobj.readyState == 4 && xobj.status == "200") {
      callback(xobj.responseText);
    }
  };
  xobj.send(null);
}