const mysql = require("sync-mysql");
const fs = require('fs');

var con = new mysql({
    host:'127.0.0.1',
    user:'russel',
    port:9092,
    password:'Comnets@2020',
    database:'topMillion',
    autocommit:true
});

var pageCache = {}
var fileStats = {}

const getFilePath = (requestUrl, initiatingUrl) => {
        
    let rows = con.query('SELECT updateFilePath FROM topMillion.cachedPages WHERE initiatingUrl=? AND requestUrl=? LIMIT 1', [initiatingUrl, requestUrl])
    return rows[0].updateFilePath;
    
}

const retrieveAndCacheFile = (requestUrl, filePath) => {
    try {
        let data = fs.readFileSync("/media/yasir/0987b43c-bb30-4be8-94d6-6d030b635e1e/top1M/"+filePath).toString();
        pageCache[requestUrl] = {data, filePath};
        return data;
    } catch(err) {
        // Consider fetching the file here
        console.log("Error retrieving file: "+filePath);
        pageCache[requestUrl] = {data: "", filePath}
        return "";
    }
}

const getFile = (requestUrl, initiatingUrl) => {
    if (pageCache.hasOwnProperty(requestUrl)) {
        return pageCache[requestUrl].data;
    }   else {
        let filePath = getFilePath(requestUrl, initiatingUrl);
        let data = retrieveAndCacheFile(requestUrl, filePath);
        return data;
    }
}

const getAllFiles = (initiatingUrl) => {
    
    let rows = con.query('SELECT * FROM topMillion.cachedPages WHERE initiatingUrl=? AND updateFilePath IS NOT NULL', [initiatingUrl])
    let res = rows.map((val) => 
                ({
                    source: retrieveAndCacheFile(val.requestUrl, val.updateFilePath),
                    url: val.requestUrl
                }));
    return res;
    
}

const getAllFilesNoRestriction = (initiatingUrl) => {
    let rows = con.query('SELECT * FROM topMillion.cachedPages WHERE initiatingUrl=?', [initiatingUrl])
    return rows;
}

const persistFile = (requestUrl) => {
    // Only need to update if we have something in the cache that's not already in db
    if (pageCache.hasOwnProperty(requestUrl)) {
        try {
            fs.writeFileSync("/media/yasir/0987b43c-bb30-4be8-94d6-6d030b635e1e/top1M/"+pageCache[requestUrl].filePath, pageCache[requestUrl].data);
        } catch(err) {
            console.log("Error writing to file");
        }
    }
}

const writeToFile = (requestUrl, initiatingUrl, data) => {
    if (!pageCache.hasOwnProperty(requestUrl)) {
        getFile(requestUrl, initiatingUrl);
    }
    pageCache[requestUrl].data = data;
}

const writeAndPersist = (requestUrl, initiatingUrl, data) => {
    writeToFile(requestUrl, initiatingUrl, data);
    persistFile(requestUrl);
}

const restoreAllFiles = (initiatingUrl) => {
    let res = getAllFiles(initiatingUrl);
    for (let i = 0 ; i < res.length ; i++) {
        tmp = retrieveAndCacheFile("tmp", pageCache[res[i].url].filePath.split(".u")[0]+".c");
        try {
            fs.writeFileSync("/media/yasir/0987b43c-bb30-4be8-94d6-6d030b635e1e/top1M/"+pageCache[res[i].url].filePath, tmp);
        } catch(err) {
            console.log("Error restoring file: "+pageCache[res[i].url].filePath);
        }
    }
    console.log("Complete Restore");
}

const setFileStats = (requestUrl, {totalFunctions, updatedFunctions, totalSize, updatedSize}) => {
    if (requestUrl in fileStats) {
        totalFunctions = (totalFunctions != null) ? totalFunctions : fileStats[requestUrl].totalFunctions;
        updatedFunctions = (updatedFunctions != null) ? updatedFunctions : fileStats[requestUrl].updatedFunctions;
        totalSize = (totalSize != null) ? totalSize : fileStats[requestUrl].totalSize;
        updatedSize = (updatedSize != null) ? updatedSize : fileStats[requestUrl].updatedSize;
    }

    fileStats[requestUrl] =  {
        totalFunctions,
        updatedFunctions,
        totalSize,
        updatedSize
    }

}

const writeFileStats = (initiatingUrl) => {
    for (const [key, value] of Object.entries(fileStats)) {
        if (value.totalSize == null) {
            value.totalSize = 0;
        }
        if (value.totalFunctions == null) {
            // We did not properly index the file
            value.totalFunctions = 0;
        }
        if (value.updatedFunctions == null) {
            // We did not properly index the file
            value.updatedFunctions = value.totalFunctions;
        }
        if (value.updatedSize == null) {
            // Could occur when there weren't any functions removed
            value.updatedSize = value.totalSize;
        }
        console.log(key, value);
        con.query('UPDATE topMillion.cachedPages SET total_functions=?, updated_functions=?, total_size=?, updated_size=? WHERE initiatingUrl=? AND requestUrl=? ', [value.totalFunctions, value.updatedFunctions, value.totalSize, value.updatedSize, initiatingUrl, key]);
    }
}

const deleteFromDbByInitiatingUrl = (initiatingUrl) => {
    con.query("DELETE FROM topMillion.cachedPages WHERE initiatingUrl=?", [initiatingUrl]);
}

const deleteAllFiles = (initiatingUrl) => {
    let res = getAllFilesNoRestriction(initiatingUrl);
    for (let i = 0 ; i < res.length ; i++) {
        try {
            fs.unlinkSync(res[i].contFilePath);
            if (res[i].updateFilePath) fs.unlinkSync(res[i].updateFilePath);
            fs.unlinkSync(res[i].headFilePath);
        } catch(e) {
            console.log(e, i);
        }
    }
    deleteFromDbByInitiatingUrl(initiatingUrl);
    console.log("Complete Clear");
}
module.exports = {getFile, persistFile, writeToFile, writeAndPersist, getAllFiles, restoreAllFiles, deleteAllFiles, setFileStats, writeFileStats}