"use strict";




/** 
 * --------------------------------------------------------------------------------------------
 * MODULES
 * --------------------------------------------------------------------------------------------
 */
 
const cheerio = require('cheerio');
const request = require('request');
const colors = require('colors');
const commandLineArgs = require('command-line-args');
const readline = require('readline');

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});




/** 
 * --------------------------------------------------------------------------------------------
 * PRIVATE VARIABLES
 * --------------------------------------------------------------------------------------------
 */

var loader = {
	current : 0,
	pipes : ['|','/','-','\\'],
	getPipe : function () {
		if ( loader.current < 3 ) {
			return loader.pipes[loader.current++];
		} else {
			let curr = loader.pipes[loader.current];
			loader.current = 0;
			return curr;
		}
	}
}





/** 
 * --------------------------------------------------------------------------------------------
 * GET USER INPUTS
 * --------------------------------------------------------------------------------------------
 */

let userInput = commandLineArgs([
	{ name: 'search', alias: 's', type: String }
]);





/** 
 * --------------------------------------------------------------------------------------------
 * PROCESS PAGE
 * --------------------------------------------------------------------------------------------
 */


let search = userInput.search || '';
let searchEncoded =  encodeURIComponent(search);
let url = `http://www.thepiratebay.org/search/${searchEncoded}`;
let searching = true;
let searchInterval;

// PROMPT
console.log(`\r\nSearching piratebay for: ${search.italic}\r\n\n`.cyan);
searchInterval = setInterval(function () {
	process.stdout.write('\r'+loader.getPipe());
}, 100);


request( url, ( err, resp, body ) => {

	clearInterval(searchInterval);

	if (!err ) {

		let $ = cheerio.load(body);
		let rows = $('#searchResult tr:not(.header)');
		let results = [];	

		console.log(`\rResult${(rows.length > 1 ? 's' : '')} : ${rows.length}\n\n`.cyan);	

		// Parse each result
		[].forEach.call(rows, (row, index) => {

			let type = [].reduce.call(
							$(row).find('.vertTh a'),
							( concat, link ) => { return concat += ' - '+$(link).text() },
							'');
			let title = $(row).find('.detLink').text();
			let seeds = $(row).children().eq(2).text();
			let leeches = $(row).children().eq(3).text();			

			results.push({
				count : index+1,
				title : title,
				type : type,
				seeds : seeds,
				leeches : leeches
			});
		});

		// Output each item to console
		results.forEach( item => {
			console.log(`\n${item.count} ${item.title.green} \n\tT:${item.type} \tS:${item.seeds.cyan} \tL:${item.leeches.yellow}`);
		});	

		// Prompt next action
		console.log('\n\nSelect action:');
		console.log(`  [${'n'.yellow}]\tNext page`);
		console.log(`  [${'s'.yellow}]\tSelect Item`);
		console.log(`  [${'x'.yellow}]\tExit`);
		rl.question(``, action => {
			switch ( action ) {
				case 'n':
					console.log('next page please'); break;
				case 's':
					console.log('should select item'); break;
				case 'x':
					process.exit(); break;
				default:
					console.log('Please select valid action');
			}
		});

		return;
	}

	throw err

});