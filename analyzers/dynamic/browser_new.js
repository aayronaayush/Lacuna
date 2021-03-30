/*
	Selenium Driver for Dynamic Analysis.
	Jesutofunmi Kupoluyi
*/
'use strict';
const { spawn } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const { TIMEOUT } = require('dns');

module.exports = function()
{

	this.start = function()
	{
		
	};

    this.generateLogFile = function(length)
    {
        let fileName = "";
        let hash = "qwertyuiopasdfghjklzxcvbnm1234567890QWERTYUIOPASDFGHJKLZXCVBNM";
        for (var i = 0; i < length; i++) {
            fileName += hash.charAt(Math.floor(Math.random()*hash.length));
        }
        return fileName;
    };

	this.load = async function(url, proxy, success)
	{
        this.logFile = `${__dirname}/logs/${this.generateLogFile(10)}`;
        let exited = false;
        this.executeTestScript = spawn('java', ['-jar', __dirname+'/browser_run_timeout.jar', url, this.logFile, proxy], {stdio: ['inherit', 'inherit', 'inherit']});
        this.executeTestScript.on('exit', (code) => {
            console.log(`child process exited with code ${code}`);
            exited = true;
            if (code == 1) {
                this.returnLogs(success);
            } else if (code == 9) {
                console.log("Could not complete DCE successfully for: ", url);
                fs.appendFileSync("error_log", url+"\n");
                process.exit(1);
            } else if (code == 11) {
                console.log("Site took too long to complete: ", url);
                fs.appendFileSync("timeout_log", url+"\n");
                process.exit(1);
            }
        });
        this.executeTestScript.on('error', () => {
            fs.appendFileSync("error_log", url+"\n");
            process.exit(1);
        });
	};

	this.returnLogs = function(success) {
        let logString = fs.readFileSync(this.logFile).toString();
        success(logString.split("\n"));
	}

	this.stop = function()
	{
		if (this.executeTestScript) {
            this.executeTestScript.kill('SIGINT');
        }
	}
};
