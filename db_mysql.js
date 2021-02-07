const mysql = require("mysql");
const fs = require('fs');

var con = mysql.createConnection({
    host:'127.0.0.1',
    user:'root',
    port:3306,
    password:'password',
    db:'deadcode',
    autocommit:true
});

var pageCache = {}
  
con.connect(function(err) {
    if (err) throw err;
    console.log("Connected!");
});

const getFilePath = async (requestUrl, initiatingUrl) => {
    return new Promise((resolve, reject) => {
        con.query('SELECT updateFilePath FROM deadcode.cachedPages WHERE initiatingUrl=? AND requestUrl=? LIMIT 1', [initiatingUrl, requestUrl], (err, rows) => {
            resolve(rows[0].updateFilePath);
        });
    })
}

const retrieveAndCacheFile = (requestUrl, filePath) => {
    let data = fs.readFileSync(filePath).toString();
    pageCache[requestUrl] = {data, filePath};
    return data
}

const getFile = async (requestUrl, initiatingUrl) => {
    if (pageCache.hasOwnProperty(requestUrl)) {
        return pageCache[requestUrl].data;
    }   else {
        let filePath = await getFilePath(requestUrl, initiatingUrl);
        let data = retrieveAndCacheFile(requestUrl, filePath);
        return data;
    }
}

const getAllFiles = async (initiatingUrl) => {
    return new Promise((resolve, reject) => {
        con.query('SELECT * FROM deadcode.cachedPages WHERE initiatingUrl=?', [initiatingUrl], (err, rows) => {
            let res = rows.map((val) => 
                ({
                    source: retrieveAndCacheFile(val.requestUrl, val.updateFilePath),
                    url: val.requestUrl
                })
            );
            resolve(res);
        });
    })
    
}

const persistFile = (requestUrl) => {
    // Only need to update if we have something in the cache that's not already in db
    if (pageCache.hasOwnProperty(requestUrl)) {
        fs.writeFileSync(pageCache[requestUrl].filePath, pageCache[requestUrl].data);
    }
}

const writeToFile = async (requestUrl, initiatingUrl, data) => {
    if (!pageCache.hasOwnProperty(requestUrl)) {
        await getFile(requestUrl, initiatingUrl);
    }
    pageCache[requestUrl].data = data;
}

const writeAndPersist = async (requestUrl, initiatingUrl, data) => {
    await writeToFile(requestUrl, initiatingUrl, data);
    persistFile(requestUrl);
}

const restoreAllFiles = async (initiatingUrl) => {
    let res = await getAllFiles(initiatingUrl);
    for (let i = 0 ; i < res.length ; i++) {
        tmp = retrieveAndCacheFile("tmp", pageCache[res[i].url].filePath.split(".u")[0]+".c")
        fs.writeFileSync(pageCache[res[i].url].filePath, tmp);
    }
    console.log("Complete Restore");
}
module.exports = {getFile, persistFile, writeToFile, writeAndPersist, getAllFiles, restoreAllFiles}