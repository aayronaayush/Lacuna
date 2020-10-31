/*
	Wrapper for headless browser.
	Niels Groot Obbink
*/
'use strict';
var webdriver = require("selenium-webdriver");
var chrome = require('selenium-webdriver/chrome');
chrome.setDefaultService(new chrome.ServiceBuilder("/usr/local/bin/chromedriver").build());
module.exports = function()
{
	this.driver = null;
	this.min_required_time = 5000;
	this.logObject ={};
	this.logInterval = null;

	this.start = async function()
	{
		let directory = __dirname+"/chrome_extension.crx";
		try {
			this.driver = await new webdriver.Builder()
				.withCapabilities(webdriver.Capabilities.chrome())
				.setChromeOptions(new chrome.Options().addExtensions([directory])) 
				.build();
		} catch (err) {
			console.log(err);
		}
	};

	this.clickElement = function(element)
	{
		return new Promise((resolve, reject) => {
			element.getId()
			.then(async (id) => {
				// We were getting issues with the id not being loaded for some reason
				try {
					let new_element = new webdriver.WebElement(this.driver, id);
					await this.driver.actions().mouseMove(new_element).click(new_element).perform();
					resolve(true);
				}
				catch (err) {
					resolve(false);
				}
			})
			.catch((err) => {
				resolve(false);
			});
		})
	}

	this.getTagName = function(element)
	{
		return new Promise((resolve, reject) => {
			element.id_
				.then(async (res) => {
					let tagName = await element.getTagName();
					resolve(tagName);
				})
				.catch((err) => {
					resolve(false);
				});
		})
	}

	this.waitForPageLoad = function()
	{
		return new Promise(async (resolve, reject) => {
			let loadState = await this.driver.executeScript("return document.readyState");
			while (loadState != "complete") {
				loadState = await this.driver.executeScript("return document.readyState");
			}
			resolve(true);
		});
	}

	this.waitForMouseMove = function() 
	{
		return new Promise((resolve, reject) => {
			setTimeout(()=>{
				resolve(true);
			}, 3000)
		});
	}

	this.waitForSetup = function()
	{
		return new Promise((resolve, reject) => {
			setTimeout(()=>{
				console.log("Setup time over");
				resolve(true);
			}, 20000);
		});
	}

	this.waitForClickResponse = function() {
		return new Promise((resolve, reject) => {
			setTimeout(()=>{
				resolve(true);
			}, 500)
		});
	}

	this.startMonitoringLog = function() {
		let me = this;
		this.logInterval = setInterval(() => {
			this.driver.manage().logs().get(webdriver.logging.Type.BROWSER).then((entries) =>
			{
				entries.forEach((entry) =>
				{
					me.logObject[entry.message] = 1;
				});
			});
		}, 1000);
	}

	this.load = async function(url, timeout, success)
	{
		// Load the page.
		console.log("Wait for setup");
		await this.waitForSetup();
		await this.driver.get(url);
		await this.waitForPageLoad();

		// Simulate interactivity
		try {
			let allElements = await this.driver.executeScript("return Array.from(document.querySelectorAll('*'));");
			let numberOfElementsOnPage = allElements.length;
			let foundBody = false;

			// Find body so we don't have to go through all elements
			this.startMonitoringLog();
			for (let i=0; i< allElements.length; i++) {
				if (await this.getTagName(allElements[i]) == "body" && !foundBody) {
					foundBody = true;
					console.log(foundBody);
				}
				else if (foundBody) {
					console.log(`${i+1} out of ${numberOfElementsOnPage}`)
					console.log(`Functions logged so far: ${Object.keys(this.logObject).length}`)
					await this.clickElement(allElements[i]);
					this.waitForClickResponse();
					allElements = await this.driver.executeScript("return Array.from(document.querySelectorAll('*'));");
					// If there is a page change in response to a click, we want to go back to our original page
					if (await this.driver.getCurrentUrl() != url) {
						console.log("Page change, returning to original page");
						await this.driver.get(url);
						await this.waitForPageLoad();
						allElements = await this.driver.executeScript("return Array.from(document.querySelectorAll('*'));");
					}
				}
			}
		} catch (err) {
			console.log(err);
			console.log("We are here");
		}
		this.returnLogs(success);
	};

	this.returnLogs = function(success) {
		success(Object.keys(this.logObject));
		clearInterval(this.logInterval);
	}

	this.stop = function()
	{
		this.driver.quit();
	}
};
