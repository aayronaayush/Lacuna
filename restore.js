const DBModel = require("./db");
let res = DBModel.find({}, async (err, res)=> {
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