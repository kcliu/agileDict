const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;
//TODO FF4 only : Cu.import("resource://gre/modules/JSON.jsm");

const CLASS_ID = Components.ID("6224daa1-71a2-4d1a-ad90-01ca1c08e323");
const CLASS_NAME = "agileDict AutoComplete";
const CONTRACT_ID = "@mozilla.org/autocomplete/search;1?name=agileDict-autocomplete";

const HTTP_OK                    = 200;
const HTTP_INTERNAL_SERVER_ERROR = 500;
const HTTP_BAD_GATEWAY           = 502;
const HTTP_SERVICE_UNAVAILABLE   = 503;


//for DEBUG, use LOG();
const LOG_PREFIX = "*** aglieDict: ";
var DEBUG = false;
function LOG(aText){
	if (DEBUG)
		dump(LOG_PREFIX + aText + "\n");
}

// Implements nsIAutoCompleteResult
function SimpleAutoCompleteResult(searchString, searchResult,
                                  defaultIndex, errorDescription,
                                  results, comments) {
	this._searchString = searchString;
	this._searchResult = searchResult;
 	this._defaultIndex = defaultIndex;
  	this._errorDescription = errorDescription;
  	this._results = results;
  	this._comments = comments;
}

SimpleAutoCompleteResult.prototype = {
	_searchString: "",
  	_searchResult: 0,
  	_defaultIndex: 0,
  	_errorDescription: "",
  	_results: [],
  	_comments: [],

    /**
   * The original search string
   */
  	get searchString() {
    	return this._searchString;
  	},

    /**
   	* The result code of this result object, either:
   	*         RESULT_IGNORED   (invalid searchString)
   	*         RESULT_FAILURE   (failure)
   	*         RESULT_NOMATCH   (no matches found)
   	*         RESULT_SUCCESS   (matches found)
   	*/
    get searchResult() {
        return this._searchResult;
    },

    /**
    * Index of the default item that should be entered if none is selected
    */
    get defaultIndex() {
        return this._defaultIndex;
  	},

  	/**
   	* A string describing the cause of a search failure
   	*/
  	get errorDescription() {
    	return this._errorDescription;
  	},

    /**
    * The number of matches
    */
  	get matchCount() {
    	return this._results.length;
  	},

  	/**
   	* Get the value of the result at the given index
   	*/
  	getValueAt: function(index) {
    	return this._results[index];
  	},

  	/**
   	* Get the comment of the result at the given index
   	*/
  	getCommentAt: function(index) {
    	return this._comments[index];
  	},

  	/**
   	* Get the style hint for the result at the given index
   	*/
  	getStyleAt: function(index) {
    	if (!this._comments[index])
      		return null;  // not a category label, so no special styling

    	if (index == 0)
      		return "suggestfirst";  // category label on first line of results

    	return "suggesthint";   // category label on any other line of results
  	},

	/**
   	* Get the image for the result at the given index
   	* The return value is expected to be an URI to the image to display
   	*/
  	getImageAt : function (index) {
    	return "";
  	},

  	/**
   	* Remove the value at the given index from the autocomplete results.
   	* If removeFromDb is set to true, the value should be removed from
   	* persistent storage as well.
   	*/
  	removeValueAt: function(index, removeFromDb) {
    	this._results.splice(index, 1);
    	this._comments.splice(index, 1);
  	},

  	QueryInterface: function(aIID) {
    	if (!aIID.equals(Ci.nsIAutoCompleteResult) && !aIID.equals(Ci.nsISupports))
        	throw Components.results.NS_ERROR_NO_INTERFACE;
    	return this;
  	}
};


// Implements nsIAutoCompleteSearch
function SimpleAutoCompleteSearch() {
}

SimpleAutoCompleteSearch.prototype = {
  	/*
   	* Search for a given string and notify a listener (either synchronously
   	* or asynchronously) of the result
   	*
   	* @param searchString - The string to search for
   	* @param searchParam - An extra parameter
   	* @param previousResult - A previous result to use for faster searchinig
   	* @param listener - A listener to notify when the search is complete
   	*/
  	_request: null,
  	_listener: null,
  	_suggestURI: null,
  	startSearch: function(searchString, searchParam, result, listener) {
		var self = this;
		var method = "GET";
		const prelink = 'http://suggestqueries.google.com/complete/search?client=suggest&hjson=t&ds=d&hl=zh-TW&jsonp=window.google.ac.hr&q='
    	this.stopSearch();
    	this._listener = listener;
	  	// Actually do the search
    	this._request = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].
        createInstance(Ci.nsIXMLHttpRequest);
		this._suggestURI = prelink+searchString; 
		LOG(this._suggestURI);
    	this._request.open(method, this._suggestURI, true);
    	function onReadyStateChange() {
      		self.onReadyStateChange();
    	}
    	this._request.onreadystatechange = onReadyStateChange;
    	this._request.send("");
  	},
  	_isBackoffError: function SAC__isBackoffError(status) {
    	return ((status == HTTP_INTERNAL_SERVER_ERROR) ||
        	    (status == HTTP_BAD_GATEWAY) ||
            	(status == HTTP_SERVICE_UNAVAILABLE));
  	},

	onReadyStateChange: function() {
    	// xxx use the real const here
    	if (!this._request || this._request.readyState != 4)
      		return;
    	try {
      		var status = this._request.status;
    	} catch (e) {
      	// The XML HttpRequest can throw NS_ERROR_NOT_AVAILABLE.
      	return;
    }

    if (this._isBackoffError(status)) {
      	//this._noteServerError();	
	  	LOG("server error");
      	return;
    }

    var responseText = this._request.responseText;
    if (status != HTTP_OK || responseText == "")
     	 return;

	LOG("responseText:" + responseText);
	//get JSON format	
	var output = responseText.match(/window.google.ac.hr\((.*)\)/);	
	output = RegExp.$1;
	LOG("output:" + output);
	
    var serverResults = JSON.parse(output);
	LOG("serverResults:" + serverResults);
    var searchString = serverResults[0] || "";
    var results = serverResults[1] || [];
	LOG("results:" + results);
	//remove the last element of entry (becuase google dict put only the index number in the last element of each entry)
	for(var i = 0;i < results.length;i++){
		results[i].pop();
	}
	
    // now put the history results above the suggestions
 	var newResult = new SimpleAutoCompleteResult(searchString, Ci.nsIAutoCompleteResult.RESULT_SUCCESS, 0, "", results);
 	this._listener.onSearchResult(this, newResult);

    // Reset our state for next time.
    this._reset();
	},
	_reset: function () {
        this._listener = null;
		this._request = null;
	},

    /*
     * Stop an asynchronous search that is in progress
     */
    stopSearch: function() {
		if (this._request) {
			this._request.abort();
			//this._request();
		}
    },    
    QueryInterface: function(aIID) {
    	if (!aIID.equals(Ci.nsIAutoCompleteSearch) && !aIID.equals(Ci.nsISupports))
        	throw Components.results.NS_ERROR_NO_INTERFACE;
    	return this;
  	}
};

// Factory
var SimpleAutoCompleteSearchFactory = {
    singleton: null,
    createInstance: function (aOuter, aIID) {
        if (aOuter != null)
            throw Components.results.NS_ERROR_NO_AGGREGATION;
        if (this.singleton == null)
        	this.singleton = new SimpleAutoCompleteSearch();
    	return this.singleton.QueryInterface(aIID);
  	}
};

// Module
var SimpleAutoCompleteSearchModule = {
    registerSelf: function(aCompMgr, aFileSpec, aLocation, aType) {
        aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    	aCompMgr.registerFactoryLocation(CLASS_ID, CLASS_NAME, CONTRACT_ID, aFileSpec, aLocation, aType);
    },

  	unregisterSelf: function(aCompMgr, aLocation, aType) {
    	aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    	aCompMgr.unregisterFactoryLocation(CLASS_ID, aLocation);        
  	},
  
  	getClassObject: function(aCompMgr, aCID, aIID) {
    	if (!aIID.equals(Components.interfaces.nsIFactory))
      		throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
    	if (aCID.equals(CLASS_ID))
      		return SimpleAutoCompleteSearchFactory;
    	throw Components.results.NS_ERROR_NO_INTERFACE;
  },
  canUnload: function(aCompMgr) { return true; }

};

// Module initialization
function NSGetModule(aCompMgr, aFileSpec) { return SimpleAutoCompleteSearchModule; }


