var GoogleDict = function () {
	return {
		foo: function() {
			alert("hello world");
		},
		clear: function() {
			document.getElementById('search-text').value = ''; 
		}
	}
}();
