const http = require('http');
const fs = require('fs');
const util = require('util');
const url = require('url');
const os = require('os');
const path = require('path');

const fileName = 'song.txt';
const fileDirectory = os.homedir();
const filePath = path.resolve(fileDirectory, fileName);

const writeFileAsync = util.promisify(fs.writeFile);

/*function readRequestBody(req) {
    return new Promise((resolve, reject) => {
        let rawBody = '';
        req.on('data', function(chunk) {
            rawBody += chunk;
        });
        req.on('end', function() {
            resolve(rawBody);
        });
        req.on('error', reject);
    });
}*/

let writingPromise = null;
let titleInQueue = null;
let lastTitle = null;

async function writeTitle(title) {
    if (title !== lastTitle) {
        await writeFileAsync(filePath, title, 'utf8');
        lastTitle = title;
    }
    if (titleInQueue) {
        const titleFromQueue = titleInQueue;
        titleInQueue = null;
        await writeTitle(titleFromQueue);
    }
}

async function saveTitleToFile(title) {
    try {
        if (!writingPromise) {
            writingPromise = writeTitle(title)
        } else {
            titleInQueue = title;
        }
        await writingPromise;
    } finally {
        writingPromise = null;
    }
}

http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    /*if (req.method === 'OPTIONS' && req.headers['access-control-request-method']) {
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        const allowHeaders = req.headers['access-control-request-headers'];
        if (allowHeaders) {
            res.setHeader('Access-Control-Allow-Headers', allowHeaders);
        }
        res.statusCode = 204;
        res.end();
        return;
    }*/
    res.setHeader('Content-Type', 'text/plain; charset=UTF-8');
    if (req.method === 'GET' && parsedUrl.pathname === '/' && Object.prototype.hasOwnProperty.call(parsedUrl.query,'title')) {
        console.log(new Date(), parsedUrl.query.title);
        saveTitleToFile(parsedUrl.query.title).then(() => {
            res.write('OK');
            res.end();
        }).catch((error) => {
            res.statusCode = 500;
            res.write(error.message);
            res.end();
        });
    } else {
        res.statusCode = 400;
        res.write('Bad Request');
        res.end();
    }
}).listen(9999);