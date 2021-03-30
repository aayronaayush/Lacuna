/*
	Webpage tools
	Niels Groot Obbink
*/

const path = require('path'),
      file_system = require('fs'),
      cheerio = require('cheerio'),
	  esprima = require('esprima');
	  DBModelMySql = require('./db_mysql');



function is_valid_type(type)
{
	const valid_types = ['text/javascript', 'application/javascript', 'application/ecmascript', 'text/ecmascript'];

	valid_types.forEach(function(entry)
	{
		if(type.indexOf(type) != -1)
		{
			return true;
		}
	});

	return false;
}


function get_functions(entry)
{
	let functions = [];
	let source_code = entry.source;

	// Parse the source code, retrieve function nodes including range data.
	esprima.parse(source_code, {range: true}, function(node)
	{
		// We are only interested in functions (declarations and expressions).
		if(node.type == 'FunctionDeclaration' || node.type == 'FunctionExpression')
		{
			let function_data =
			{
				type: null,
				name: null,

				start: node.range[0],
				end: node.range[1],

				body:
				{
					start: node.body.range[0],
					end: node.body.range[1]
				}
			};

			if(node.type == 'FunctionDeclaration')
			{
				function_data.type = 'declaration';
				function_data.name = node.id.name;
			}else{
				// If it's not a FunctionDeclaration, it must be a FunctionExpression.
				function_data.type = 'expression';
			}

			// Special case: if inline js, add offset to location.
			if(entry.type == 'inline')
			{
				function_data.start += entry.location.start;
				function_data.end += entry.location.start;
				function_data.body.start += entry.location.start;
				function_data.body.end += entry.location.start;
			}

			// Save the function data.
			functions.push(function_data);
		}
	});

	return functions;
}


let get_scripts = function(url)
{
	let scripts =
	{
		normal: [],
		async: [],
		defered: []
	};
	
	res = DBModelMySql.getAllFiles(url);
	if (res == null || res.length == 0) {
		console.error("Error getting proxy url, ensure the url has been instrumented with the proxy");
		process.exit(2);
	}
	else {
		res.forEach((module) => {
			let entry = {
				type: null,			// 'inline', 'script'
				source: null,		// source code
				file: null,			// file name of the script (or HTML file name).
				functions: null,	// list of functions and location
				// Optional:
				location: null,		// if type is 'inline', the offset of the code in the HTML document ({start, end}).
			};
			entry.type = 'script';
			entry.source = module.source;
			entry.file = module.url;
			entry.full_path = module.url;
			entry.file_indexed = entry.file;
			entry.full_path_indexed = entry.full_path;

			try {
				entry.functions = get_functions(entry);
			} catch(exception) {
				entry.functions = [];
				console.error("Error parsing: ", entry.file);
				// throw 'webpage_tools error: JS parse error: ' + exception;
			}
			// assume everything is in normal order
			scripts.normal.push(entry);
		})
		return scripts.normal;
	}
};


module.exports =
{
	get_scripts: get_scripts
}
