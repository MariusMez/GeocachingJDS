const dotenv = require('dotenv');
dotenv.config();
// Since Node 8, have errors
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const startingDate = new Date("Sat, 20 May 2019 08:00:00 GMT");

const express = require('express');
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

app.post('/check_coordinates', async function(req, res) {
    const coords = req.body.coords;
    const gps = await jds.checkCoordinates(coords);
    res.send(gps);
});

let cpUpload = upload.fields([{ name: 'pic', maxCount: 1 }, { name: 'spoiler', maxCount: 1 }]);
app.post('/save', cpUpload, async function(req, res) {
    const cache_admin_id = req.body.cache_admin_id;
    const name = req.body.name;
    const owner_email = req.body.owner_email;
    const description = req.body.description;
    const type_geocache = req.body.type_geocache.toUpperCase();
    const coords_geocache = req.body.coords_geocache;
    const geocache_lat = req.body.geocache_lat;
    const geocache_lng = req.body.geocache_lng;
    let photo = null;
    try { photo = req.files['pic'][0]; } catch (e) {}
    let spoiler = null;
    try { spoiler = req.files['spoiler'][0]; } catch (e) {}
    const hint = req.body.hint;
    const owner = req.body.owner;
    const cache_size = req.body.cache_size.toUpperCase();
    const difficulty = req.body.difficulty;
    const terrain = req.body.terrain;
    const notes = req.body.notes;
    const need_review = req.body.need_review;
    let gps = await jds.checkCoordinates(coords_geocache);

    if(cache_admin_id) {
        try {
            const geocache = await jds.getGeocacheWithAdminId(cache_admin_id);
            if (geocache) {
                // Redirection si la cache est déjà activée pour publication
                if(geocache.get("Active") === true) {
                    const message = "La cache est déjà publiée ou va l'être prochainement, les modifications sont désactivées.<br>Contactez-nous directement.";
                    const result = "error";
                    res.redirect(`/create?admin_id=${cache_admin_id}&result=${result}&message=${message}`);
                    return;
                }

                geocache.set("Nom", name);
                geocache.set("Description", description);
                geocache.set("Category", type_geocache);
                geocache.set("GPSBox", gps.dms);
                if(type_geocache==='TRADI') {
                    geocache.set("GPSString", gps.dms);
                } else {
                    geocache.set("GPSString", 'N 43° XX.XXX E 007° YY.YYY');
                }
                let geopoint = null;
                if(geocache_lat && geocache_lng) {
                    geopoint = new Parse.GeoPoint({latitude: parseFloat(geocache_lat), longitude: parseFloat(geocache_lng)});
                } else {
                    geopoint = new Parse.GeoPoint({latitude: gps.lat, longitude: gps.lng});
                }
                geocache.set("GPS", geopoint);
                geocache.set("Indice", hint);
                geocache.set("Owner", owner);
                geocache.set("Size", cache_size);
                geocache.set("Difficulty", parseInt(difficulty));
                geocache.set("Terrain", parseInt(terrain));
                geocache.set("Notes", notes);
                let need_review_bool = false;
                if(need_review==='on') {
                    need_review_bool = true;
                }
                geocache.set("NeedReview", need_review_bool);

                if(photo) {
                    const photo_file = await jds.createThumbnail(photo.buffer, 1000, 1000, 'png');
                    geocache.set("Photo", photo_file);
                }
                if(spoiler) {
                    const spoiler_file = await jds.createThumbnail(spoiler.buffer, 1000, 1000, 'png');
                    geocache.set("Spoiler", spoiler_file);
                }

                geocache.save().then((object) => {
                    const message = "OK";
                    const result = "success";
                    urlCache = "https://geocaching-jds.fr/geocache?id=" + geocache.id;
                    jds.sendToSlack("CJ2R50ULB", "Nouvelle cache ou nouvelle modif de " +urlCache );
                    res.redirect(`/create?admin_id=${cache_admin_id}&result=${result}&message=${message}`);
                }, (error) => {
                    console.error("Error in geocache.save(): " + error);
                    res.render('error', { message: error.message });
                });
            }
        } catch (e) {
            const message = e;
            const result = "error";
            console.error(e);
            res.redirect(`/create?admin_id=${cache_admin_id}&result=${result}&message=${message}`);
        }

    }
    else {
        res.redirect('/');
    }
});

app.get('/create', async function(req, res) {
    const id_administration = req.query.admin_id;
    if(id_administration) {
        const geocache = await jds.getGeocacheWithAdminId(id_administration);
        if(geocache) {

            const qr_code_text = `https://geocaching-jds.fr/flashit?id=${geocache.get("codeId")}`;
            const qr_data_url = await jds.generateQRCode(qr_code_text);

            let geopoint = geocache.get("GPS");
            if(!geopoint) {
                geopoint = new Parse.GeoPoint({latitude: 0.0, longitude: 0.0});
            }
            let photo_url = "/public/images/logo_jds.png";
            try {
                photo_url = geocache.get("Photo").url({forceSecure: true}).replace(/^[a-zA-Z]{3,5}\:\/{2}[a-zA-Z0-9_.:-]+\//, '');
            } catch (error) { }
            let spoiler_url = "/public/images/nospoiler.png";
            try {
                spoiler_url = geocache.get("Spoiler").url({forceSecure: true}).replace(/^[a-zA-Z]{3,5}\:\/{2}[a-zA-Z0-9_.:-]+\//, '');
            } catch (error) { }
            
            res.render('create', {
                gps: geopoint,
                cache_admin_id: id_administration,
                cache_active: geocache.get("Active"),
                publication_date: geocache.get("Publication"),
                cacheId: geocache.id,
                owner_email: geocache.get("OwnerEmail"),
                type: geocache.get("Category"),
                cache_size: geocache.get("Size"),
                difficulty: geocache.get("Difficulty"),
                notes: geocache.get("Notes"),
                photo: photo_url,
                spoiler: spoiler_url,
                terrain: geocache.get("Terrain"),
                gps_string: geocache.get("GPSBox"),
                hint: geocache.get("Indice"),
                nom: geocache.get("Nom"),
                description: geocache.get("Description"),
                owner: geocache.get("Owner"),
                need_review: geocache.get("NeedReview"),
                qr: qr_data_url
            });
        } else {
            console.error("Error in call to /create with " + id_administration);
            res.redirect('/');
        }
    } else {
        console.error("Error in call to /create no admin_id");
        res.redirect('/');
    }
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
        const nom = cache.get("Nom");
        const publicationDate = cache.get("Publication");
        const difficulty = cache.get("Difficulty");
        const terrain = cache.get("Terrain");
        const size = cache.get("Size");
        const category = cache.get("Category");
        let photoUrl = "https://geocaching-jds.fr/public/images/logo_jds.png";
        try {
            photoUrl = cache.get("Photo").url({forceSecure: true}).replace(/^[a-zA-Z]{3,5}\:\/{2}[a-zA-Z0-9_.:-]+\//, '');
        } catch (error) { }
        let spoiler = "https://geocaching-jds.fr/public/images/nospoiler.png";
        try {
            spoiler = cache.get("Spoiler").url({forceSecure: true}).replace(/^[a-zA-Z]{3,5}\:\/{2}[a-zA-Z0-9_.:-]+\//, '');
        } catch (error) { }
        const description = cache.get("Description");
        const indice = cache.get("Indice");
        const gps = cache.get("GPS");
        const coordString = cache.get("GPSString");
        const fav = cache.get("Fav");
        const owner = cache.get("Owner");
        const geocacheId = cache.id;

        const Logs = Parse.Object.extend("Log");
        let queryLog = new Parse.Query(Logs);
        queryLog.equalTo("Geocache", cache);
        queryLog.equalTo("Active", true);
        queryLog.descending("createdAt");
        let logs = await queryLog.find();
        if(logs) {
            res.render('geocache', { nom:nom, id:geocacheId,
                fav: fav, d:difficulty, owner: owner,
                t:terrain, cat:category,
                size:size, coord:coordString,
                gps:gps, description:description,
                indice:indice, photo:photoUrl,
                spoiler:spoiler, logs:logs,
                publication:publicationDate });
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
            if(cache.get("OwnerEmail").toLowerCase() === email) {
                console.log(`${email} essaye de logguer sa propre géocache !`);
                res.render('error', { message: "Hum, il semblerait que vous êtes propriétaire de cette géocache 🤔"});
                return;
            }
            jds.getLogWithEmailAndCache(email, cache).then((resLogs) => {
                if(resLogs) {
                    res.render('error', { message: "Géocache déjà trouvée et signée avec l'email : " + email });
                }
                else {
                    console.log("Log with email: " + email + " was not found - Looking for a Geocacheur to prepare a new Log");
                    jds.getGeocacheurWithEmail(email).then((geocacheur) => {
                        if(geocacheur) {
                            jds.getLogsByEmail(email).then((logs) => {
                                console.log(logs.length + " Logs with email : " + email);
                                var firstfound = logs.length == 0 ? true : false;
                                res.render('foundit', { nom: cache.get("Nom"),
                                firstfound: firstfound,
                                id: cache.id,
                                email: geocacheur.get("Email"),
                                pseudo: geocacheur.get("Pseudo"),
                                cat: cache.get("Category") });
                            });
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
                    if(cache.get("OwnerEmail").toLowerCase() === email) {
                        console.log(`${email} essaye de logguer sa propre géocache dans /found le fourbe !`);
                        res.render('error', { message: "Hum, il semblerait que vous êtes propriétaire de cette géocache 🤔"});
                        return;
                    }
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

                                jds.getLogsByEmail(email).then((logs) => {
                                    // if this log is the first one from the geocacheur his nickname must be updated
                                    if (logs.length == 0) {
                                        geocacheur.set("Pseudo", name);
                                        geocacheur.save();
                                    }
                                    res.render('foundit', { nom: cache.get("Nom"),
                                    firstfound: firstfound,
                                    id: cache.id,
                                    email: geocacheur.get("Email"),
                                    pseudo: geocacheur.get("Pseudo"),
                                    cat: cache.get("Category") });
                                });

                                logEntry.save().then((object) => {
                                    urlCache = "https://geocaching-jds.fr/geocache?id=" + cache.id;
                                    jds.sendToSlack("CJG45C81M", "Nouveau log de " + geocacheur.get("Email") + " sur " + urlCache);
                            
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
