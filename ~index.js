var Nightmare = require('nightmare');
var nightmare = Nightmare({ show: true });

var search = 'Mr. Robot';
var searchString = encodeURIComponent(search);

console.log('searchString',searchString);

nightmare
	.viewport(1280, 800)
	// .goto('http://www.thepiratebay.org/search/' + searchString)
	.goto('http://www.google.com')
	.wait()
	.screenshot()
	.run(function (err) {
		
	});
