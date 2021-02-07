/*
	Selenium Driver for Dynamic Analysis.
	Jesutofunmi Kupoluyi
*/
'use strict';
const { spawn } = require('child_process');
const readline = require('readline');
const fs = require('fs');

module.exports = function()
{

	this.start = function()
	{
		
	};

    this.generateLogFile = function(length)
    {
        let fileName = "";
        let hash = "qwertyuiopasdfghjklzxcvbnm1234567890";
        for (var i = 0; i < length; i++) {
            fileName += hash[Math.floor(Math.random()*hash.length)-1];
        }
        return fileName;
    };

	this.load = async function(url, timeout, success)
	{
        this.logFile = `${__dirname}/logs/${this.generateLogFile(10)}`;
		this.executeTestScript = spawn('java', ['-jar', __dirname+'/browser_run.jar', url, this.logFile, __dirname+'/chrome_extension_test.crx'], {stdio: ['inherit', 'inherit', 'inherit']});
        this.executeTestScript.on('close', (code) => {
            console.log(`child process exited with code ${code}`);
            this.returnLogs(success);
        });
	};

	this.returnLogs = function(success) {
        let logs = []
        const readInterface = readline.createInterface({
            input: fs.createReadStream(this.logFile),
            console: false
        });
        readInterface.on('line', function(line) {
            logs.push(line)
        });
        readInterface.on('close', function() {
            success(logs);
        })
	}

	this.stop = function()
	{
		if (this.executeTestScript) {
            this.executeTestScript.kill('SIGINT');
        }
	}
};
