const dotenv = require('dotenv');
dotenv.config();
// Since Node 8, have errors
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const startingDate = new Date("Sat, 01 May 2019 08:00:00 GMT");

let express = require('express');
const bodyParser = require('body-parser');
const ParseServer = require('parse-server').ParseServer;
const path = require('path');
const multer = require('multer');

const Recaptcha = require('recaptcha-verify');
let recaptcha = new Recaptcha({
    secret: process.env.RECAPTCHA_SECRET_KEY,
    verbose: true
});

// var ca = [fs.readFileSync("/etc/letsencrypt/live/geocaching-jds.fr/fullchain.pem")];

let jds = require('./geocaching-jds');

let api = new ParseServer({
    databaseURI: process.env.MONGODB_ADDON_URI, // Use the MongoDB URI
    // databaseOptions: {
    //     ssl: true,
    //     checkServerIdentity: false,
    //     sslValidate: true,
    //     sslCA: ca
    // },
    cloud: process.env.CLOUD_CODE_MAIN || __dirname + '/cloud/main.js',
    appId: process.env.PARSE_APPID, // Use environment variable to set the APP_ID
    serverURL: process.env.SERVER_URL || 'http://localhost:1337/parse', // Don't forget to change to https if needed
    masterKey: process.env.PARSE_MASTERKEY // Use environment variable to set the PARSE_MASTERKEY
});
// Client-keys like the javascript key or the .NET key are not necessary with parse-server
// If you wish you require them, you can set them as options in the initialization above:
// javascriptKey, restAPIKey, dotNetKey, clientKey

let app = express();
let upload = multer();

// Global app configuration section
app.set('views', 'cloud/views');  // Specify the folder to find templates
app.set('view engine', 'ejs');    // Set the template engine
// Serve static assets from the /public folder
app.use('/public', express.static(path.join(__dirname, '/public')));

// Serve the Parse API on the /parse URL prefix
const mountPath = process.env.PARSE_MOUNT || '/parse';
app.use(mountPath, api);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
// This is an example of hooking up a request handler with a specific request
// path and HTTP verb using the Express routing API.
app.get('/', function(req, res) {
    res.render('index', { message: 'Page principale' });
});

app.get('/tools', function(req, res) {
    res.render('tools', { message: 'Outils application mobile' });
});

app.get('/ranking2017', function(req, res) {
    res.render('ranking2017');
});

app.get('/ranking2018', function(req, res) {
    res.render('ranking2018');
});

app.get('/register', function(req, res) {
    res.render('register');
});

app.get('/ranking', function(req, res) {
    jds.getAllActiveRanking("Score, ScoreFTF, ScoreDT").then(function(ranking) {
        jds.getAllPublishedGeocaches("RatioFav, Ratio").then(function(caches) {
            jds.getAllActiveRanking("ScoreFTF").then(function(rankFTF) {
                res.render('ranking', { ranking:ranking, geocacheursFTF:rankFTF, geocaches:caches });
            }, function(error) {
                console.error("Error in getAllActiveRanking(ScoreFTF): " + error.message);
                res.render('error', { message:error.message });
            });
        }, function(error) {
            console.error("Error in getAllPublishedGeocaches: " + error.message);
            res.render('error', { message:error.message });
        });
    }, function(error) {
        console.error("Error in getAllActiveRanking: " + error.message);
        res.render('error', { message:error.message });
    });
});


app.get('/geocaches', function(req, res) {
    let moment = require('./cloud/moment-with-locales.min.js');
    moment.locale('fr');
    app.locals.moment = moment;

    const now = Date.now();
    let start = false;
    if(startingDate < now) {
        start = true;
    }

    jds.getAllPublishedGeocaches("Publication").then(function(geocaches) {
        jds.getLastLogs(5).then(function(logs) {
            res.render('geocaches', { geocaches:geocaches, logs:logs, start:start });
        }, function(error) {
            console.error("Error in getLastLogs: " + error.message);
            res.redirect('/');
        });
    }, function(error) {
        console.error("Error in getAllPublishedGeocaches: " + error.message);
        res.redirect('/');
    });
});


app.get('/photoscaches', async function(req, res) {
    let page = req.query.page;
    if (page === undefined) {
        page = 1;
    }
    const max = 12;

    const Log = Parse.Object.extend("Log");
    let query = new Parse.Query(Log);
    query.descending("createdAt");
    query.equalTo("Active", true);
    query.exists("PhotoUrl");
    query.count().then(async (count) => {
        let skip = 0;
        if (count > max) { skip = (page - 1) * max; }
        let queryLog = new Parse.Query(Log);
        queryLog.descending("createdAt");
        queryLog.equalTo("Active", true);
        queryLog.exists("PhotoUrl");
        queryLog.limit(max);
        queryLog.skip(skip);
        queryLog.include("Geocache");
        queryLog.find().then( (logs) => {
            res.render('photos', { logs: logs,
                page: page,
                pages: count / max });
        }, (error) => {
            console.error(error.message);
            res.redirect('/');
        });
    }, (error) => {
        console.error(error.message);
        res.redirect('/');
    });
});

app.get('/geocaching', function(req, res) {
    res.render('geocaching');
});

app.get('/geocache', function(req, res) {
    let moment = require('./cloud/moment-with-locales.min.js');
    moment.locale('fr');

    const shortDateFormat = "dddd @ HH:mm";
    app.locals.moment = moment;
    app.locals.shortDateFormat = shortDateFormat;

    const Geocache = Parse.Object.extend("Geocache");
    let query = new Parse.Query(Geocache);
    query.get(req.query.id).then( async (cache) => {
        const geocacheName = cache.get("Nom");
        const geocachePublicationDate = cache.get("Publication");
        const geocacheDifficulty = cache.get("Difficulty");
        const geocacheTerrain = cache.get("Terrain");
        const geocacheSize = cache.get("Size");
        const geocacheCategory = cache.get("Category");
        const geocachePhotoUrl = cache.get("Photo").url({forceSecure: true}).replace(/^[a-zA-Z]{3,5}\:\/{2}[a-zA-Z0-9_.:-]+\//, '');
        const geocacheDescription = cache.get("Description");
        const geocacheIndice = cache.get("Indice");
        const geocacheSpoiler = cache.get("Spoiler").url({forceSecure: true}).replace(/^[a-zA-Z]{3,5}\:\/{2}[a-zA-Z0-9_.:-]+\//, '');
        const geocacheGPS = cache.get("GPS");
        const geocacheCoordString = cache.get("GPSString");
        const geocacheFav = cache.get("Fav");
        const geocacheId = cache.id;

        const Logs = Parse.Object.extend("Log");
        let queryLog = new Parse.Query(Logs);
        queryLog.equalTo("Geocache", cache);
        queryLog.equalTo("Active", true);
        queryLog.descending("createdAt");
        let logs = await queryLog.find();
        if(logs) {
            res.render('geocache', { nom:geocacheName, id:geocacheId,
                fav: geocacheFav, d:geocacheDifficulty,
                t:geocacheTerrain, cat:geocacheCategory,
                size:geocacheSize, coord:geocacheCoordString,
                gps:geocacheGPS, description:geocacheDescription,
                indice:geocacheIndice, photo:geocachePhotoUrl,
                spoiler:geocacheSpoiler, logs:logs,
                publication:geocachePublicationDate });
        }
    }, (error) => {
        res.redirect('/geocaches');
    });
});

app.get('/flashit', function(req, res) {
    const codeId = req.query.id;
    jds.getGeocacheWithCodeId(codeId).then((cache) => {
        if(cache) {
            res.render('flashit', { nom: cache.get("Nom"),
                code: cache.get("codeId"),
                cat: cache.get("Category")});
        } else {
            console.log("Geocache with codeId: " + codeId + " was not found");
            res.render('error', { message:"Code de suivi invalide !"});
        }
    }, (error) => {
        console.error("Error in flashit: " + error);
        res.render('error', { message:"Code de suivi invalide ! " + error.message });
    });
});

app.post('/myscore', function(req, res) {
    const email = req.body.email.toLowerCase();

    let promiseGeocacheur = jds.getGeocacheurWithEmail(email);
    let promiseScore = jds.computeScoreForGeocacheur(email);

    Promise.all([promiseScore, promiseGeocacheur]).then((values) => {
        let score = values[0];
        let geocacheur = values[1];
        if (geocacheur === undefined) {
            throw "Geocacheur " + email + " non trouvé";
        }
        if (score === undefined) {
            res.render('error', { message:error });
        } else {
            console.log("score not null : " + score);
            res.render('myscore', { email:email, pseudo:geocacheur.get("Pseudo"), scoresCache:score.scoreCaches });
        }
    }).catch((error) => {
            console.error(error);
            res.render('error', { message:error });
        }
    );
});

app.post('/flash', function(req, res) {
    const codeId = req.body.code.toUpperCase();
    const email = req.body.email.toLowerCase();

    jds.getGeocacheWithCodeId(codeId).then((cache) => {
        if(cache) {
            jds.getLogWithEmailAndCache(email, cache).then((resLogs) => {
                if(resLogs) {
                    res.render('error', { message: "Géocache déjà trouvée et signée avec l'email : " + email });
                }
                else {
                    console.log("Log with email: " + email + " was not found - Looking for a Geocacheur to prepare a new Log");
                    jds.getGeocacheurWithEmail(email).then((geocacheur) => {
                        if(geocacheur) {
                            res.render('foundit', { nom: cache.get("Nom"),
                                id: cache.id,
                                email: geocacheur.get("Email"),
                                pseudo: geocacheur.get("Pseudo"),
                                cat: cache.get("Category") });
                        } else {
                            res.render('error', { message: "Geocacheur non trouvé avec l'email : " + email });
                        }
                    }, (error) => {
                        res.render('error', { message: error.message });
                    });
                }
            }, (error) => {
                res.render('error', { message: error.message });
            });
        } else {
            console.log("Geocache with codeId: " + codeId + " was not found");
            res.render('error', { message:"Géocache non trouvée, le code de suivi semble incorrect !"});
        }
    }, (error) => {
        res.render('error', { message: error.message });
    });
});

app.post('/found', upload.single('pic'), function (req, res, next) {

    const name = req.body.name;
    const email = req.body.email.toLowerCase();
    const message = req.body.message;
    const fav = req.body.fav;
    const cacheId = req.body.id;
    const photoFile = req.file;

    jds.getGeocacheurWithEmail(email).then((geocacheur) => {
        if(geocacheur) {
            jds.getGeocache(cacheId).then((cache) => {
                if(cache) {
                    jds.getAllActiveLogWithCache(cache).then((logs) => {
                        jds.hasEmailFoundGeocache(email, cache).then((isGeocacheAlreadyFound) => {
                            if (isGeocacheAlreadyFound) {
                                res.render('error', { message: "Géocache déjà trouvée et signée avec l'email : " + email });
                            }
                            else {
                                const Log = Parse.Object.extend("Log");
                                let logEntry = new Log();
                                logEntry.set("Pseudo", name);
                                logEntry.set("Email", email);
                                logEntry.set("Message", message);
                                logEntry.set("Date", new Date());
                                logEntry.set("Geocache", cache);
                                logEntry.set("Active", true);

                                if(photoFile) {
                                    const filename = photoFile.originalname;
                                    const photoFileBase64 = photoFile.buffer.toString('base64');
                                    let parseFile = new Parse.File(filename, { base64: photoFileBase64 });
                                    const photo_url = parseFile.url({forceSecure: true});
                                    logEntry.set("PhotoUrl", photo_url);
                                    logEntry.set("Photo", parseFile);
                                }

                                // Becarefull with this, not always the case in the field
                                let ftfScore = 0;
                                let stfScore = 0;
                                let ttfScore = 0;
                                if(logs.length === 0) {
                                    ftfScore = 1;
                                } else if(logs.length === 1) {
                                    stfScore = 1;
                                } else if(logs.length === 2) {
                                    ttfScore = 1;
                                }
                                logEntry.set("FTF", ftfScore);
                                logEntry.set("STF", stfScore);
                                logEntry.set("TTF", ttfScore);

                                if(fav === "true") {
                                    logEntry.set("Fav", true);
                                    cache.increment("Fav");
                                    cache.save();
                                } else {
                                    logEntry.set("Fav", false);
                                }

                                logEntry.save().then((object) => {
                                    res.render('found', { cacheid: cache.id,
                                        cat: cache.get("Category"),
                                        geocacheurId: geocacheur.id,
                                        message:"Bravo " + name
                                            + " !<br><br>N'oubliez pas de signer aussi le logbook ;-)<br>"
                                            + "Et attention aux moldus !" });
                                }, (error) => {
                                    console.error("Error in logEntry.save(): " + error);
                                    res.render('error', { message: error.message });
                                });
                            }
                        }, (error) => {
                            console.error("Error in hasEmailFoundGeocache: " + error);
                            res.render('error', { message: error.message });
                        });
                    }, (error) => {
                        console.error("Error in getAllActiveLogWithCache: " + error);
                        res.render('error', { message: error.message });
                    });
                }
                else {
                    console.log("Geocache with id: " + cacheid + " was not found");
                    res.render('error', { message:"Géocache non trouvée !" });
                }
            }, (error) => {
                console.error("Error in getGeocache: " + error);
                res.render('error', { message: error.message });
            });
        } else {
            console.log("Geocacheur with email: " + email + " was not found");
            res.render('error', { message:"Il n'y a pas de géocacheur activé avec l'email : " + email});
        }
    }, (error) => {
        console.error("Error in getGeocacheurWithEmail: " + error);
        res.render('error', { message:error.message });
    });
});

const port = process.env.PORT || 1337;
const httpServer = require('http').createServer(app);
httpServer.listen(port, function() {
    console.log('Geocaching-JDS running on port ' + port + '.');
});

// This will enable the Live Query real-time server
ParseServer.createLiveQueryServer(httpServer);
