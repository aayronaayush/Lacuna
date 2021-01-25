/*
	JavaScript dynamic dead code elimination tool.
	Niels Groot Obbink
*/

'use strict';


let path = require('path'),
	JsEditor = require('./js_editor'),
	Browser = require('./browser_new');


module.exports =
	{
		settings:
			{
				logger_name: '___jdce_logger'
			},


		run: async function(settings, callback)
		{
			// Log call is formatted 'identifier|file|start|end'.
			let js_head_code = `
			var ` + this.settings.logger_name + ` = function(file_name, start, end)
			{
				console.log('` + this.settings.logger_name + `|' + file_name + '|' + start + '|' + end);
			};
		`;

			let script_editors = [];
			for (let i = 0; i < settings.scripts.length; i++) {
				// Create a new script editor instance and save it so we can change the source, and reset it afterwards.
				let js = new JsEditor();

				// Save it, so we can access it later (and restore the original source).
				script_editors[settings.scripts[i].file] = js;
				
				console.log(`Generating AST for script (${i+1}/${settings.scripts.length})`)
				js.load(settings.scripts[i].full_path, settings.scripts[i].source, settings.url);

				// Add a log call to each function in this script. The only argument (a function) specifies the format.
				js.add_log_calls((file, start, end) =>
					{
						return `if(functions_logged["${file}|${start}|${end}"]==null){functions_logged["${file}|${start}|${end}"]=true;console.warn('${this.settings.logger_name}', '|', '${file}', '|', ${start}, '|', ${end});}\n`;
					}
				);

				await js.save();
			}

			// Create a new Browser instance, and a list of all log calls.
			let browser = new Browser(),
				log_calls = [],
				logger_name = this.settings.logger_name;

			// Open the web app, and deal with the results.
			await browser.start();

			browser.load(settings.url, settings.timeout, function(console_logs)
			{
				let logs = parse_logs(console_logs, logger_name);
				cleanup();
				return_results(logs);
			});



			function parse_logs(logs, logger_name)
			{
				let logs_per_file = {};
				logs.forEach(function(log)
				{
					// logs are formatted 'identifier|file|start|stop'.
					let regex = /([^\|]+) "([^\|]+)" "\|" "([^\|]+)" "\|" ([^\|]+) "\|" ([^\|]+)/g;
					let result = regex.exec(log);	// [data, logger_name, file_name, start, end]
					// Only look for logs that start with our log identifier.
					if(result === null ||  result[2] != logger_name)
					{
						return;
					}

					let file = result[3],
						start = result[4],
						end = result[5];

					if( ! logs_per_file.hasOwnProperty(file) )
					{
						logs_per_file[ file ] = [];
					}

					// Comparison function
					let exists = function(entry)
					{
						return entry.start == start && entry.end == end;
					};

					// Functions can be called twice or more, so remove duplicate entries before inserting.
					if( ! logs_per_file[ file ].some( exists ) )
					{
						logs_per_file[ file ].push(
							{
								start: start,
								end: end
							});
					}
				});
				return logs_per_file;
			}



			function cleanup()
			{
				// Reset JS files.
				for(let editor in script_editors)
				{
					if(script_editors.hasOwnProperty(editor))
					{
						script_editors[editor].restore();
						script_editors[editor].save();
					}
				}

				// Close the browser.
				browser.stop();
			}



			function fix_results(results)
			{
				let files = [];
				settings.scripts.forEach(function(script)
				{
					let correct_name = script.file;		
					files[correct_name] = results[correct_name];
						
				});
				return files;
			}

			function print_analytics(results) {
				for (const file in script_editors) {
					if (script_editors[file].functions != null) {
						const [functionsNotCalledInFile, totalWordCount] = get_functions_not_called_in_file(results, file)
						console.log(`In ${file}, there were ${script_editors[file].functions.length} functions in total. ${functionsNotCalledInFile.length} were removed, saving ${totalWordCount} bytes.`);

					}
				}
			}

			function get_functions_not_called_in_file(results, file) {
				let totalWordCount = 0;
				const functionsNotCalledFilter = (file) => {
					// Create a function_start_map to store the start position of all the functions that were called. The idea is that two functions can't start at the same position
					let function_start_map = {};
					if (results[file] != null) {
						results[file].forEach((entry) => {
							function_start_map[entry.start] = 1;
						});
					}

					// Return the filter function which uses this function start map
					return (entry) => {
						// check if the start position of the function we're looking at is in the function start map, if it's not, then the function was not called
						if (function_start_map[entry.start] == null) {
							totalWordCount += (entry.end-entry.start);
							return true;
						}
						return false;
					};
				};

				return [script_editors[file].functions.filter(functionsNotCalledFilter(file)), totalWordCount];

			}

			function return_results(results)
			{
				results = fix_results(results);
				print_analytics(results);
				// Return statistics to caller.
				callback( results );
			}
		}
	};