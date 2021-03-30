const DBModelMysql = require("./db_mysql");
const argument_parser = require('command-line-args');

options = argument_parser(
	[
        { name: 'url', type: String }
    ]
)

if (!options["url"]) {
    console.error("Please provide a url");
    process.exit(1);
}

DBModelMysql.restoreAllFiles(options["url"]);