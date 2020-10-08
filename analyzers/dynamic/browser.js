/*
	Wrapper for headless browser.
	Niels Groot Obbink
*/

'use strict';

var phantomjs = require('phantomjs-prebuilt-that-works')
var selenium = require('selenium-webdriver')
var JSSoup = require('jssoup').default;
var TAGS = ["nav","li","ul","div","p","span","h1","h2","h3","h4","h5","h6","p","button"];

var i;

module.exports = function()
{
	this.driver = null;
	this.min_required_time = 5000;

	this.start = function()
	{
		// Change the binary path from the default selenium phantomjs settings.
		let phantomjs_capabilities = selenium.Capabilities.phantomjs();

		phantomjs_capabilities.set("phantomjs.binary.path", phantomjs.path);

		// Build a custom phantomJS driver.
		this.driver = new selenium.Builder().withCapabilities(phantomjs_capabilities).build();
	};


	this.load = function(url, timeout, success)
	{
		let me = this;

		// Load the page.
		this.driver.get(url);

		// wait for the page to load all the contents
		this.driver.sleep(1000);

		this.driver.executeScript("console.log('test functionality')");
		this.driver.executeScript("window.scrollTo(0, document.body.scrollHeight);");

		// get the rendered HTML code
		this.soup = this.driver.getPageSource();

		//var tagsOnSite = this.driver.executeScript("a = Array.from(document.querySelectorAll('*')); return a;")




		var curr_tag = this.driver.findElements(selenium.By.css("p")).length;
		console.log('asdf');
		// console.log(curr_tag.constructor);




		// The function to run.
		let runner = function()
		{
			let logs = [];

			// Retrieve console.log results.
			me.driver.manage().logs().get('browser').then(function(entries)
			{
				entries.forEach(function(entry)
				{
					console.log(entry);
					logs.push(entry.message);
				});

				success(logs);
			});
		};

			// After the timeout, collect the console.log entries and call the success callback function.
		if(timeout)
		{
			// Wait at least min_required_time (browser startup time) seconds, more if we have a longer timeout.
			setTimeout(runner, Math.max(timeout, me.min_required_time));
		}else{
			setTimeout(runner, me.min_required_time);
		}
	};


	this.stop = function()
	{
		this.driver.quit();
	}
};
