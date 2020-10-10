/*
	Wrapper for headless browser.
	Niels Groot Obbink
*/
'use strict';
var webdriver = require("selenium-webdriver");
var chrome = require('selenium-webdriver/chrome');
var path = require('chromedriver').path;
var service = new chrome.ServiceBuilder(path).build();
chrome.setDefaultService(service);

module.exports = function()
{
	this.driver = null;
	this.min_required_time = 5000;

	this.start = function()
	{
		this.driver = new webdriver.Builder().withCapabilities(webdriver.Capabilities.chrome())
			.build();
	};


	this.load = async function(url, timeout, success)
	{
		let me = this;

		// Load the page.
		this.driver.get("file://"+url);

		// Trigger click event for every element
		try {
			let allElements = await this.driver.executeScript("return Array.from(document.querySelectorAll('*'));");
			allElements.forEach( (element) => {
				element.id_
				.then(()=>{
					element.click();
				})
				.catch((err) => {
				});
			});
		} catch (err) {
			console.log(err);
		}

		// The function to run.
		let runner = function()
		{
			let logs = [];
			me.driver.manage().logs().get(webdriver.logging.Type.BROWSER).then(function(entries)
			{
				entries.forEach(function(entry)
				{
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
