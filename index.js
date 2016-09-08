"use strict";




/** 
 * --------------------------------------------------------------------------------------------
 * MODULES
 * --------------------------------------------------------------------------------------------
 */

const _ = require('underscore'); 
const cheerio = require('cheerio');
const request = require('request');
const colors = require('colors');
const Table = require('cli-table');
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

// piratebay url
const URL = 'http://www.thepiratebay.org';

// loader animation
let loader = {
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
let requestInterval;


// TORRENT ITEM CONSTRUCTOR
let Torrent = function (opts) {

	let defaults = {
		info : {},
		pageBody : ''
	};

	// private torrent object
	let _torrent = {};

	let options = _.extend(_.clone(defaults),opts || {});
	
	// APPLY PROPERTIES
	for ( let prop in options ) {
		_torrent[prop] = options[prop];
		Object.defineProperty( this, prop, {
			get : function () {
				return _torrent[prop];
			},
			set : function (value) {
				_torrent[prop] = value;
			}
		});
	}

	// ADDITIONAL PUBLIC PROPERTIES AND METHODS
	Object.defineProperties( this, {

		hasInfo : {
			value : function () {
				return _torrent.info && Object.keys(_torrent.info).length > 0 ? true : false;
			}
		}

	});


}








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
	let url = `${URL}/search/${searchEncoded}`;

	// PROMPT
	console.log(`\r\nSearching piratebay for: "${search.italic}"`.cyan);

	showLoading();
	searchRequest(url);
}

/**
 * Performs search request and prints the result to console
 */
function searchRequest(url) {

	request( url, ( err, resp, body ) => {

		stopLoading();

		if (!err ) {

			$ = cheerio.load(body);
			let rows = $('#searchResult tr:not(.header)');

			console.log(`Result${(rows.length > 1 ? 's' : '')} : ${rows.length}\n\n`.cyan);	

			// Parse each result
			[].forEach.call(rows, (row, index) => {

				let type = [].reduce.call(
								$(row).find('.vertTh a'),
								( concat, link ) => {
									if ( concat ) {
										return concat += ' - '+$(link).text();
									}
									return  $(link).text();
								}, '');
				let title = $(row).find('.detLink').text();
				let seeds = $(row).children().eq(2).text();
				let leeches = $(row).children().eq(3).text();
				let pageLink = $(row).find('.detLink').attr('href');
				let magnetLink = $(row).find('a[href^=magnet]').attr('href');

				results.push(new Torrent({
					count : index+1,
					title : title,
					type : type,
					seeds : seeds,
					leeches : leeches,
					pageLink : URL+pageLink,
					magnetLink : magnetLink
				}));
			});

			// Output each item to console
			results.forEach( item => {
				console.log(`\n${item.count} ${item.title.green} \n\tT: ${item.type} \tS:${item.seeds.cyan} \tL:${item.leeches.yellow}`);
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
				promptResultsSelection();
		}
	});
}

/**
 * Prompts user to select an item from list of results
 */
function promptItemSelection () {
	rl.question('\n\nPlease select the number of your choice: \n'.green, number => {

		if ( isNaN(number) ) return promptItemSelection();

		let index = number - 1;
		let item = results[index];

		promptItemTaskSelection(item);
	});
}

/**
 * Shows options for currently selected item
 */
function promptItemTaskSelection(item) {
	console.log(`\n\nWhat would like to do for\n${item.title.italic}?`.green);
	console.log(`  [${'c'.yellow}] Show comments\n  [${'i'.yellow}] Show info\n  [${'d'.yellow}] Download torrent\n  [${'n'.yellow}] ${'None, restart search'.italic}`);
	rl.question('', task => {
		switch ( task ) {
			case 'c':
				showItemComments(item); break;
			case 'i':
				showItemInfo(item); break;
			case 'd':
				startItemDownload(item); break;
			case 'n':
				promptSearchInput(); break;
			default:
				console.log('\n\nPlease select a valid option'.yellow);
				promptItemTaskSelection(item); break;
		}
	});
}

/**
 * Fetches and shows info for the item
 */
function showItemInfo(item) {

	let table;

	// If item's info is not yet fetched
	if ( !item.hasInfo() ) {
		return getItemInfo(item, (info) => {
			item.info = info;
			showItemInfo(item);
		});
	} 

	// Show info to console
	table = new Table();

	table.push(
		{ Title 	: item.title || ''},
		{ Type 		: item.type || ''},
		{ Size  	: item.info.size || ''},
		{ Files 	: item.info.files || ''},
		{ Seeders 	: item.seeds || ''},
		{ Leechers 	: item.leeches || ''},
		{ Language 	: item.info.language || ''},
		{ Uploaded 	: item.info.uploaded || ''},
		{ Uploader 	: item.info.uploader || ''}
	);

	console.log(table.toString.bind(table)());
	
	promptItemTaskSelection(item);
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
	process.exit();
}

/**
 * Performs a request to the result item's page and cache the body
 * @param  {object}   item     The search result item object
 * @param  {Function} callback Callback function on success
 * @param  {Function} onError Callback function on error
 */
function requestItemPageBody(item,callback,onError) {

	onError = onError || function (err) {
		throw '\n\n'+`Unable to fetch page for ${item.title.italic}`.bgRed;
	};

	console.log(`\n\nFetching item's page for ${item.title}...`.green);
	showLoading();

	request( item.pageLink, ( err, resp, body ) => {	
		stopLoading();
		if ( !err ) {
			return callback(body);
		}
		onError(err);	
	});

}

function getItemInfo (item,callback,onError) {

	// If page content is not yet cached
	if ( !item.pageBody ) {
		return requestItemPageBody(item, (body) => {
			item.pageBody = body;
			getItemInfo(item,callback,onError);
		});
	}

	// process cached page content
	let $ = cheerio.load(item.pageBody);

	// scrape the info block
	let $details = $('#details');
	let $col1 = $details.children('.col1');
	let $col2 = $details.children('.col2');

	// construct info
	let info = {
		files : $col1.find('[title="Files"]').text(),
		size : $col1.find('dd').eq(2).text(),
		uploaded : $col2.find('dd').eq(0).text(),
		uploader : $col2.find('dd').eq(1).text(),
		seeders : parseInt($col2.find('dd').eq(2).text()),
		leechers : parseInt($col2.find('dd').eq(3).text()),
		comments : parseInt($col2.find('dd').eq(4).text())
	};

	callback(info);
	
}

// Simply shows a loading animation
function showLoading () {
	let requesting = true;
	console.log('\n\n');
	requestInterval = setInterval(function () {
		process.stdout.write('\r'+loader.getPipe());
	}, 100);
}

// Stops loading animation
function stopLoading () {
	clearInterval(requestInterval);
	process.stdout.write('\r');
}







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

