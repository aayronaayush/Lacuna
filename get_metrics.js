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
        totalBytesSaved = 0
        originalSize = 0
        for (let i in res[j].modules) {
            totalBytesSaved += res[j].modules[i].originalBody.length - res[j].modules[i].latestBody.length
            originalSize += res[j].modules[i].originalBody.length
            console.log(res[j].modules[i].url, res[j].modules[i].originalBody.length - res[j].modules[i].latestBody.length, "bytes saved")
        }
        console.log("In total: ", totalBytesSaved, "bytes saved", (totalBytesSaved/originalSize)*100, "% reduction")
    }
    console.log("Metrics Complete");
   
});


process.stdin.resume();