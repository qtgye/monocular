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
const exec = require('child_process').exec;

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
};

let results = []; // list of results

let userInput = {}; // CLI arguments

let $; // cheerio body object

// Utility variables
let searchInterval;








/** 
 * --------------------------------------------------------------------------------------------
 * PRIVATE FUNCTIONS
 * --------------------------------------------------------------------------------------------
 */

/**
 * Prompts for search string
 */
function promptSearchInput () {
	rl.question('\n\nWhat do you like to search from piratebay?\n'.green, startSearch);
}

/**
 * process search string and calls search request
 */
function startSearch (searchString) {

	let search = userInput.search = searchString || '';
	let searchEncoded =  encodeURIComponent(search);
	let url = `http://www.thepiratebay.org/search/${searchEncoded}`;
	let searching = true;

	// PROMPT
	console.log(`\r\nSearching piratebay for: "${search.italic}"\r\n\n`.cyan);
	searchInterval = setInterval(function () {
		process.stdout.write('\r'+loader.getPipe());
	}, 100);

	searchRequest(url);
}

/**
 * Performs search request and prints the result to console
 */
function searchRequest(url) {

	request( url, ( err, resp, body ) => {

		clearInterval(searchInterval);

		if (!err ) {

			$ = cheerio.load(body);
			let rows = $('#searchResult tr:not(.header)');

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
				let magnetLink = $(row).find('a[href^=magnet]').attr('href');

				results.push({
					count : index+1,
					title : title,
					type : type,
					seeds : seeds,
					leeches : leeches,
					magnetLink : magnetLink
				});
			});

			// Output each item to console
			results.forEach( item => {
				console.log(`\n${item.count} ${item.title.green} \n\tT:${item.type} \tS:${item.seeds.cyan} \tL:${item.leeches.yellow}`);
			});

			promptResultsSelection();

			return;
		}

		throw err;

	});
}

/**
 * Prompts options for results next action
 * @return {[type]} [description]
 */
function promptResultsSelection() {
	// Prompt next action
	console.log('\n\nSelect action:'.green);
	console.log(`  [${'n'.yellow}]\tNext page`);
	console.log(`  [${'s'.yellow}]\tSelect Item`);
	console.log(`  [${'x'.yellow}]\tExit`);
	rl.question(``, action => {
		switch ( action ) {
			case 'n':
				console.log('next page please'); break;
			case 's':
				promptItemSelection(); break;
			case 'x':
				process.exit(); break;
			default:
				console.log('Please select valid action');
		}
	});
}

/**
 * Prompts user to select an item from list of results
 */
function promptItemSelection () {
	rl.question('\n\nPlease select the number of your choice: \n'.green, number => {
		let index = number - 1;
		let item = results[index];
		// open magnet using default app
		promptItemTaskSelection(item);
	});
}

/**
 * Shows options for currently selected item
 */
function promptItemTaskSelection(item) {
	console.log(`\n\nWhat would like to do for\n${item.title.italic}?`.green);
	console.log(`  [${'c'.yellow}] Show comments\n  [${'i'.yellow}] Show info\n  [${'d'.yellow}] Download torrent`);
	rl.question('', task => {
		switch ( task ) {
			case 'c':
				showItemComments(item); break;
			case 'i':
				showItemInfo(item); break;
			case 'd':
				startItemDownload(item); break;
			default:
				console.log('\n\nPlease select a valid option'.yellow);
				promptItemTaskSelection(item);
		}
		rl.close();
		process.exit();
	});
}

/**
 * Fetches and shows info for the item
 */
function showItemComments(item) {
	// get request for the item page, scrape info
}

/**
 * Fetches and shows comments for the item
 */
function showItemComments(item) {
	// get request for the item page, scrape comments
}

/**
 * Opens the item's magnet link using default torrent app
 */
function startItemDownload(item) {
	console.log(`\n\nOpening default torrent app...\n\n`.green);
	exec(`open ${item.magnetLink}`);
}







/** 
 * --------------------------------------------------------------------------------------------
 * GET USER INPUTS
 * --------------------------------------------------------------------------------------------
 */







/** 
 * --------------------------------------------------------------------------------------------
 * INIT
 * --------------------------------------------------------------------------------------------
 */

// Get user input
userInput = commandLineArgs([
	{ name: 'search', alias: 's', type: String }
]);

if ( userInput.search ) {
	startSearch(userInput.search);
} else {
	promptSearchInput();
}

