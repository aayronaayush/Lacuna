const DBModel = require("./db");
const argument_parser = require('command-line-args'),
options = argument_parser(
	[
        { name: 'url', type: String }
    ]
)

if (!options["url"]) {
    console.error("Please provide a url");
    process.exit(1);
}
let res = DBModel.find({siteName: options["url"]}, async (err, res)=> {
    if (err) {
        console.error(err);
    }
    for(let j in res) {
        for (let i in res[j].modules) {
            res[j].modules[i].latestBody = res[j].modules[i].originalBody
        }
        await DBModel.update({siteName: res[j].siteName}, res[j]);
    }
    console.log("Complete Restore");
   
});


process.stdin.resume();