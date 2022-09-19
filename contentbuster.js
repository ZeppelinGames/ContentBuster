const fs = require('fs');
const http = require('http');
const puppeteer = require('puppeteer');

const RED = '\x1b[31m%s\x1b[0m';
const GREEN = '\x1b[32m%s\x1b[0m';
const YELLOW = '\x1b[33m%s\x1b[0m';

const args = process.argv.slice(2);

const makeRequest = (path = "/") => new Promise((resolve, reject) => {
    const options = {
        host: host,
        port: port,
        path: path
    };

    http.get(options, function (res) {
        for (let i = 0; i < codes.length; i++) {
            if (codes[i] === res.statusCode.toString()) {
                reject("Matches excluded status code");
            }
        }

        setTimeout(() => {
            reject("Request timed out");
        }, timeout);

        resolve(`${path} ${res.statusCode} ${res.statusMessage}`);

    }).on('error', function (e) {
        reject(`Hostname '${e.hostname}' not found`);
    });
});

const requiredArgs = ['-u', '-w'];

let verbose = false;

const funcMap = [
    ['help', () => {
        console.log(YELLOW, "Help");
        console.log("-u".padEnd(10) + "URL to make requests to (required)");
        console.log("-w".padEnd(10) + "Path wordlist to use with URL (required)");
        console.log("-p".padEnd(10) + "Port to make requests to (default: 80)");
        console.log("-t".padEnd(10) + "Request timeout in millis (default: 2000)");
        console.log("-e".padEnd(10) + "Response HTML needs to not contain this content to be valid");
        console.log("-i".padEnd(10) + "Response HTML needs to contain this content to be valid");
        console.log("-s".padEnd(10) + 'Status codes to ignore. Format "<code>, <code>" (default: "400, 403, 404, 500, 502, 503, 504")');
        console.log();
        console.log(YELLOW, "Example:");
        console.log("node .\\contentbuster.js -u mydomain.com -w ./wordlist.txt -p 5000 -e \"<div>\"");
        console.log("Connects to 'mydomain.com' on port 5000 and makes to requests with paths in 'wordlist.txt' excluding any pages that contain the HTML content '<div>'");
        console.log();
        process.exit();
    }],
    ['v', () => {
        verbose = true;
    }]
];

const argsMap = new Map();

console.log("");
for (let i = 0; i < args.length; i++) {
    if (isArgument(args[i])) {
        //check next ele
        if (i + 1 >= args.length || isArgument(args[i + 1])) {
            console.error(`Arguement ${args[i]} missing context`);
            return;
        }

        //console.log(`Added ${args[i]} with context ${args[i + 1]}`);
        argsMap.set(args[i], args[i + 1]);
        i++;
    } else {
        //run command with --arg
        const func = getFunc(args[i]);
        if (func == null) {
            console.error(`Unknown arguement ${args[i]}`);
            process.exit();
        }

        func[1]();
    }
}

//Check required args
const argsKeys = [...argsMap.keys()];
for (let i = 0; i < requiredArgs.length; i++) {
    if (!argsKeys.includes(requiredArgs[i])) {
        console.error(`Missing required argument ${requiredArgs[i]}`);
        process.exit();
    }
}

//Make sure wordlist exists
if (!fs.existsSync(argsMap.get('-w'))) {
    console.error("Wordlist doesn't exist");
    process.exit();
}

//Run check on site
if (argsMap.get('-u').indexOf("//") < 0) {
    console.log(RED, "HTTP protocol not specified");
    process.exit();
}

const protocolIndex = argsMap.get('-u').indexOf('//') + 2;
const protocol = argsMap.get('-u').substring(0, protocolIndex);
const host = argsMap.get('-u').substring(protocolIndex);
const port = argsMap.get('-p') ? argsMap.get('-p') : 80;
const timeout = argsMap.get('-t') ? argsMap.get('-t') : 2000;
const exclude = argsMap.get('-e') ? argsMap.get('-e') : "";
const includeContent = argsMap.get('-i') ? argsMap.get('-i') : "";
const codes = argsMap.get('-s') ? argsMap.get('-s').split(",") : ["400", "403", "404", "500", "502", "503", "504"];

console.log(exclude);

console.log(YELLOW, `Attempting connection to ${host} on port ${port}`);
makeRequest("/").then((e) => {
    console.log(GREEN, e);

    const allFileContents = fs.readFileSync(argsMap.get('-w'), 'utf-8');
    allFileContents.split(/\r?\n/).forEach(line => {
        makeRequest(line).then((e) => {
            //console.log(GREEN, e);

            //do proper js enabled req
            requestPage(line, (f, r) => {
                if (f) {
                    console.log(GREEN, e);
                } else {
                    if (verbose) {
                        console.log(RED, `${e}: ${r}`);
                    }
                }
            });

        }).catch((e) => {
            if (verbose) {
                console.log(RED, e);
            }
        });
    });
}).catch((e) => {
    console.error(RED, e);
    return;
});

const requestPage = async (path = "/", callback) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const url = `${protocol}${host}` + (port == "80" ? `` : `:${port}`) + `${path}`;
    await page.goto(url, { waitUntil: 'networkidle0' });
    const HTML = await page.content();
    const data = HTML.toString();

    await browser.close();

    if (exclude.length > 0 && data.includes(exclude)) {
        callback(false, "Includes excluded content");
        return;
    }
    if (includeContent.length > 0 && !data.includes(includeContent)) {
        callback(false, "Doesnt include required content");
        return;
    }

    callback(true, "Sucessful");
}

function isArgument(str) {
    if (!str.startsWith("--")) {
        if (str.startsWith("-")) {
            return true;
        }
    }
    return false;
}

function getFunc(str) {
    if (str.startsWith("--")) {
        str = str.substring(2);
    }

    for (let i = 0; i < funcMap.length; i++) {
        if (funcMap[i][0].toLowerCase() === str.toLowerCase()) {
            return funcMap[i];
        }
    }

    return null;
}