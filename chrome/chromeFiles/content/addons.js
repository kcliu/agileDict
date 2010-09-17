var addons = function () {
	return {
		foo: function() {
			alert("hello world");
		},
		clear: function() {
			document.getElementById('search-text').value = ''; 
		},
		showResults: function() {
			var ret = document.getElementById("");
			ret.setAttribute('context','results');
		}
		
	}
}();
