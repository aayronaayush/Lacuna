/*
	Wrapper for headless browser.
	Niels Groot Obbink
*/
'use strict';
var webdriver = require("selenium-webdriver");
var chrome = require('selenium-webdriver/chrome');
module.exports = function()
{
	this.driver = null;
	this.min_required_time = 5000;

	this.start = async function()
	{
		let directory = __dirname+"/chrome_extension.crx";
		console.log(webdriver.Capabilities.chrome().map_);
		try {
			this.driver = await new webdriver.Builder()
				.withCapabilities(webdriver.Capabilities.chrome())
				.setChromeOptions(new chrome.Options().addExtensions([directory])) 
				.setChromeService(new chrome.ServiceBuilder("/usr/bin/chromedriver"))
				.build();
		} catch (err) {
			console.log(err);
		}
	};

	this.clickElement = function(element)
	{
		return new Promise((resolve, reject) => {
			element.id_
				.then((res) => {
					element.click();
					resolve(element);
				})
				.catch((err) => {

				});
		})
	}

	this.waitForPageLoad = function()
	{
		return new Promise((resolve, reject) => {
			setTimeout(()=>{
				resolve(true);
			}, 5000)
		});
	}

	this.waitForClickResponse = function() {
		return new Promise((resolve, reject) => {
			setTimeout(()=>{
				resolve(true);
			}, 3000)
		});
	}

	this.load = async function(url, timeout, success)
	{
		// Load the page.
		await this.waitForPageLoad();
		await this.driver.get("https://culinary-architecture.com");
		await this.waitForPageLoad();

		// Simulate interactivity
		try {
			let allElements = await this.driver.executeScript("return Array.from(document.querySelectorAll('*'));");
			let numberOfElementsOnPage = allElements.length;

			// Loop through all elements and click on them
			for (let i = 0; i<numberOfElementsOnPage; i++) {
				await this.clickElement(allElements[i]);
				await this.waitForClickResponse();

				// If there is a page change in response to a click, we want to go back to our original page
				if (await this.driver.getCurrentUrl() != "https://culinary-architecture.com") {
					console.log("Page change, returning to original page");
					await this.driver.get("https://culinary-architecture.com");
					await this.waitForPageLoad();

					allElements = await this.driver.executeScript("return Array.from(document.querySelectorAll('*'));");
					// Sanity check, if we don't have the same page structure, restart
					if (numberOfElementsOnPage != allElements.length) {
						i = 0;
						numberOfElementsOnPage = allElements.length;
					}
				}
			}
		} catch (err) {
			console.log(err);
		}

		this.returnLogs(success);
	};

	this.returnLogs = function(success) {
		let logs = [];
		this.driver.manage().logs().get(webdriver.logging.Type.BROWSER).then(function(entries)
		{
			entries.forEach(function(entry)
			{
				logs.push(entry.message);
			});
			console.log(logs)
			success(logs);
		});
	}

	this.stop = function()
	{
		this.driver.quit();
	}
};
