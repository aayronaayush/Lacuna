const mysql = require("mysql");
const fs = require('fs');

var con = mysql.createConnection({
    host='127.0.0.1',
    user:'russel',
    port:9092,
    password:'Comnets@2020',
    db='deadcode',
    autocommit:true
});

var pageCache = {}
  
con.connect(function(err) {
    if (err) throw err;
    console.log("Connected!");
});

const getFilePaths = async (url) => {
    const rows = await con.query('SELECT requestUrl, updateFilePath FROM cachedPages WHERE initiatingUrl=?', [url]);
    return rows;
}

const getFile = async (requestUrl, initiatingUrl) => {
    if (pageCache.hasOwnProperty(requestUrl)) {
        return pageCache[requestUrl];
    }   else {
        const rows  = await con.query('SELECT updateFilePath FROM cachedPages WHERE initiatingUrl=? AND requestUrl=? LIMIT 1', [initiatingUrl, requestUrl]);
        let filePath = rows[0].updateFilePath;
        let data = fs.readFileSync(filePath)
        pageCache[requestUrl] = {data, filePath};
        return data;
    }
}

const getAllFiles = async (initiatingUrl) => {
    const rows = await con.query('SELECT * FROM cachedPages WHERE initiatingUrl=? AND requestUrl=? AND type = ?', [initiatingUrl, requestUrl, "application/javascript"]);
    rows.map((val) => 
        ({
            source: getFile(val.requestUrl, val.initiatingUrl),
            url: val.requestUrl
        })
    );
    return rows;
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

module.exports = {getFilePaths, getFile, persistFile, writeToFile, writeAndPersist, getAllFiles}