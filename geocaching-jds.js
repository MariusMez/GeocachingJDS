const starting_jds_date = "2019-05-10";
const Coordinates = require('coordinate-parser');
const qrcode = require('qrcode-generator');
const {createCanvas, loadImage, Image} = require('canvas');
const {WebClient} = require('@slack/web-api');

const slack = new WebClient(process.env.SLACK_TOKEN);

function sendToSlack(channel, message) {
    (async () => {
        // Use the `auth.test` method to find information about the installing user
        const res = await slack.auth.test();

        // Use the `chat.postMessage` method to send a message from this app
        await slack.chat.postMessage({
            channel: channel,
            text: message,
        });
    })();
}

// This function returns the coordinate
// conversion string in DD to DMS.
function ddToDm(latitude, longitude) {

    let lat = parseFloat(latitude);
    let lng = parseFloat(longitude);

    let latResult = (lat >= 0) ? 'N ' : 'S ';

    // Call to getDm(lat) function for the coordinates of Latitude in DMS.
    // The result is stored in latResult variable.
    latResult += getDm(lat);

    let lngResult = (lng >= 0) ? 'E ' : 'W ';

    // Call to getDm(lng) function for the coordinates of Longitude in DMS.
    // The result is stored in lngResult variable.
    lngResult += getDm(lng);

    // Joining both variables and separate them with a space.
    let dmResult = latResult + ' ' + lngResult;

    // Return the resultant string
    return dmResult;
}

function getDm(valeur) {
    let val = Math.abs(valeur);

    let valDeg = Math.floor(val);
    let result = valDeg + "° ";

    let valMin = Math.round(((val - valDeg) * 60) * 1000) / 1000;
    result += valMin + "'";

    return result;
}

const checkCoordinates = async function checkCoordinates(coords) {
    let latitude = 0.0;
    let longitude = 0.0;
    try {
        const position = new Coordinates(coords);
        latitude = position.getLatitude();
        longitude = position.getLongitude();
    } catch (error) {
        console.error("Invalid coordinates : " + coords);
    }
    return {lat: latitude, lng: longitude, dms: ddToDm(latitude, longitude)}
};

const generateQRCode = async function generateQRCode(text) {
    const canvas = createCanvas(650, 320);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, 650, 320);
    ctx.font = '30px Impact';
    ctx.fillStyle = "#000000";
    ctx.fillText('ÉPREUVE GÉOCACHING 2019', 100, 50);
    const res_img = await loadImage(__dirname + '/public/images/logo_jds.png');
    ctx.drawImage(res_img, 0, 70, 400, 200);
    let qr = qrcode(0, 'L');
    qr.addData(text);
    qr.make();
    const qrcode_img = new Image();
    qrcode_img.src = qr.createDataURL();
    ctx.drawImage(qrcode_img, 420, 70, 200, 200);
    return canvas.toDataURL();
};

const createThumbnail = async function createThumbnail(image_buffer, maxWidth, maxHeight, format) {
    const sharp = require('sharp');
    return sharp(image_buffer).resize(maxWidth, maxHeight, {fit: 'inside', withoutEnlargement: true})
        .toFormat(format)
        .toBuffer()
        .then(async (buffer_img) => {
            let thumb = new Parse.File(`thumbnail.${format}`, {base64: buffer_img.toString('base64')});
            return await thumb.save();
        }, (error) => {
            console.log("Thumbnail generation error: " + error.message);
        });
};


function randomString(length, chars) {
    let result = '';
    for (let i = length; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))];
    return result;
}

const generateCodeId = function generateCodeId() {
    return randomString(8, '123456789ABCDEFGHJKMNPQRTVWXYZ')
};

const generateAdminId = function generateAdminId() {
    return randomString(32, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ')
};

const getGeocache = function (id) {
    return new Promise((resolve, reject) => {
        const Geocache = Parse.Object.extend("Geocache");
        let query = new Parse.Query(Geocache);
        query.get(id).then((result) => {
            if (result) {
                resolve(result);
            } else {
                resolve(null);
            }
        }, (error) => {
            console.error("Error searching for Geocache with id: " + id + " Error: " + error);
            reject(error);
        });
    });
};

const getGeocacheWithCodeId = function (geocacheCodeId) {
    return new Promise((resolve, reject) => {
        const Geocache = Parse.Object.extend("Geocache");
        let query = new Parse.Query(Geocache);
        query.equalTo("codeId", geocacheCodeId);
        query.equalTo("Active", true);
        query.first().then((result) => {
            if (result) {
                resolve(result);
            } else {
                resolve(null);
            }
        }, (error) => {
            console.error("Error searching for Geocache with CodeId: " + geocacheCodeId + " Error: " + error);
            reject(error);
        });
    });
};

const getGeocacheWithAdminId = function (adminId) {
    return new Promise((resolve, reject) => {
        const Geocache = Parse.Object.extend("Geocache");
        let query = new Parse.Query(Geocache);
        query.equalTo("adminId", adminId);
        query.first().then((result) => {
            if (result) {
                resolve(result);
            } else {
                resolve(null);
            }
        }, (error) => {
            console.error("Error searching for Geocache with adminId: " + adminId + " Error: " + error);
            reject(error);
        });
    });
};

const getAllPublishedGeocaches = function (descending) {
    return new Promise((resolve, reject) => {
        const Geocaches = Parse.Object.extend("Geocache");
        let query = new Parse.Query(Geocaches);
        query.equalTo("Active", true);
        query.lessThanOrEqualTo("Publication", new Date());
        query.descending(descending);
        query.limit(1000);
        query.find().then((results) => {
            if (results) {
                resolve(results);
            } else {
                resolve(null);
            }
        }, (error) => {
            console.error("Error searching for published Geocaches - Error: " + error);
            reject(error);
        });
    });
};

const getLastLogs = function (limit) {
    return new Promise((resolve, reject) => {
        const Log = Parse.Object.extend("Log");
        let query = new Parse.Query(Log);
        query.descending("createdAt");
        query.equalTo("Active", true);
        query.limit(limit);
        query.include("Geocache");
        query.find().then((results) => {
            if (results) {
                resolve(results);
            } else {
                resolve(null);
            }
        }, (error) => {
            console.error("Error searching for Logs - Error: " + error);
            reject(error);
        });
    });
};

const getLogWithEmailAndCache = function (email, geocache) {
    return new Promise((resolve, reject) => {
        const Logs = Parse.Object.extend("Log");
        let query = new Parse.Query(Logs);
        query.equalTo("Email", email);
        query.equalTo("Geocache", geocache);
        query.equalTo("Active", true);
        query.first().then((result) => {
            if (result) {
                resolve(result);
            } else {
                resolve(null);
            }
        }, (error) => {
            console.error("Error searching for Log with email: " + email + " Error: " + error);
            reject(error);
        });
    });
};

const getAllActiveLogWithCache = function (geocache) {
    return new Promise((resolve, reject) => {
        const Logs = Parse.Object.extend("Log");
        let query = new Parse.Query(Logs);
        query.descending("createdAt");
        query.equalTo("Active", true);
        query.equalTo("Geocache", geocache);
        query.find().then((results) => {
            if (results) {
                resolve(results);
            } else {
                resolve(null);
            }
        }, (error) => {
            console.error("Error searching for Log with cache: " + geocache.id + " Error: " + error);
            reject(error);
        });
    });
};

const getGeocacheurWithEmail = function (email) {
    console.log("getGeocacheurWithEmail " + email);
    return new Promise((resolve, reject) => {
        const Geocacheur = Parse.Object.extend("Geocacheur");
        let query = new Parse.Query(Geocacheur);
        query.equalTo("Email", email);
        query.equalTo("Active", true);
        query.first().then((result) => {
            if (result) {
                resolve(result);
            } else {
                resolve(null);
            }
        }, (error) => {
            console.error("Error searching for Geocacheur with email: " + email + " Error: " + error);
            reject(error);
        });
    });
};

const hasEmailFoundGeocache = function (email, geocache) {
    return new Promise((resolve, reject) => {
        const Log = Parse.Object.extend('Log');
        let query = new Parse.Query(Log);
        query.equalTo("Email", email);
        query.equalTo("Geocache", geocache);
        query.equalTo("Active", true);
        query.first().then((result) => {
            if (result) {
                resolve(result);
            } else {
                resolve(null);
            }
        }, (error) => {
            console.error("Error searching for Log with: " + email + " Error: " + error);
            reject(error);
        });
    });
};

const getAllActiveRanking = function (descending) {
    return new Promise((resolve, reject) => {
        const Ranking = Parse.Object.extend("Ranking");
        let query = new Parse.Query(Ranking);
        query.descending(descending);
        query.equalTo("Active", true);
        query.include("Geocacheur");
        query.limit(1000);
        query.find().then((results) => {
            if (results) {
                resolve(results);
            } else {
                resolve(null);
            }
        }, (error) => {
            reject(error);
        });
    });
};

const saveRanking = function (geocacheur, active) {
    return new Promise((resolve, reject) => {
        const Ranking = Parse.Object.extend("Ranking");
        let ranking = new Ranking();
        ranking.set("Geocacheur", geocacheur);
        ranking.set("Email", geocacheur.get("Email"));
        ranking.set("FTF", 0);
        ranking.set("STF", 0);
        ranking.set("TTF", 0);
        ranking.set("ScoreFTF", 0);
        ranking.set("ScoreTB", 0);
        ranking.set("ScoreCache", 0);
        ranking.set("ScoreDT", 0);
        ranking.set("Score", 0);
        ranking.set("Found", 0);
        ranking.set("Active", active);
        ranking.save(null).then(function () {
            resolve(ranking);
        }, (error) => {
            reject(error);
        });
    });
};

const getGeocachesByOwnerEmail = function (email) {
    return new Promise((resolve, reject) => {
        const Geocaches = Parse.Object.extend("Geocache");
        let query = new Parse.Query(Geocaches);
        query.equalTo("OwnerEmail", email);
        query.equalTo("Active", true);
        query.lessThanOrEqualTo("Publication", new Date());
        query.limit(1000);
        query.find().then((results) => {
            if (results) {
                resolve(results);
            } else {
                resolve(null);
            }
        }, (error) => {
            console.error("Error searching for Geocaches owner - Error: " + error);
            reject(error);
        });
    });
};

const computeScoreForGeocacheur = function (email) {
    console.log("computeScoreForGeocacheur " + email);
    return new Promise((resolve, reject) => {

        const nbPointsFoundIt = 20;
        const nbPointsFTF = 3;
        const nbPointsSTF = 2;
        const nbPointsTTF = 1;
        const nbPointsFavOwner = 1;

        let promiseGeocacheur = getGeocacheurWithEmail(email);
        let promiseLogs = getLogsByEmail(email);
        let promiseCaches = getGeocachesByOwnerEmail(email);

        Promise.all([promiseGeocacheur, promiseLogs, promiseCaches]).then((values) => {
            let geocacheur = values[0];
            let mylogs = values[1];
            let myCaches = values[2];

            let scoreCaches = {
                found: 0,
                FTF: 0,
                STF: 0,
                TTF: 0,
                ScoreFTF: 0,
                ScoreDT: 0,
                ScoreFound: 0,
                ScoreCache: 0,
                total: 0,
                caches: []
            };

            // Fav for cache owner
            myCaches.forEach( (cache) => {
                let nbPointsFav = cache.get("Fav");
                scoreCaches.ScoreCache = scoreCaches.ScoreCache + (nbPointsFav * nbPointsFavOwner);
            });

            // logs caches
            mylogs.forEach((log) => {
                let cache = {
                    id: log.get("Geocache").id,
                    name: log.get("Geocache").get("Nom"),
                    diff: log.get("Geocache").get("Difficulty"),
                    terrain: log.get("Geocache").get("Terrain")
                };
                scoreCaches.ScoreDT = scoreCaches.ScoreDT + log.get("Geocache").get("Difficulty") + log.get("Geocache").get("Terrain");
                scoreCaches.found = scoreCaches.found + 1;
                scoreCaches.ScoreFound = scoreCaches.ScoreFound + nbPointsFoundIt;
                if (log.get("FTF") > 0) {
                    cache.ftf = "🥇 FTF";
                    scoreCaches.FTF = scoreCaches.FTF + 1;
                    scoreCaches.ScoreFTF = scoreCaches.ScoreFTF + nbPointsFTF;
                } else if (log.get("STF") > 0) {
                    cache.ftf = "🥈 STF";
                    scoreCaches.STF = scoreCaches.STF + 1;
                    scoreCaches.ScoreFTF = scoreCaches.ScoreFTF + nbPointsSTF;
                } else if (log.get("TTF") > 0) {
                    cache.ftf = "🥉 TTF";
                    scoreCaches.TTF = scoreCaches.TTF + 1;
                    scoreCaches.ScoreFTF = scoreCaches.ScoreFTF + nbPointsTTF;
                } else {
                    cache.ftf = "Pas dans le top 3";
                }

                scoreCaches.caches.push(cache);
            });

            scoreCaches.total = scoreCaches.ScoreFTF + scoreCaches.ScoreDT + scoreCaches.ScoreFound + scoreCaches.ScoreCache;
            const result = {geocacheur: geocacheur, scoreCaches: scoreCaches};
            console.log(result);
            resolve(result);
        }).catch((error) => {
            console.error(error);
            throw error;
        });
    });
};

const saveOrUpdateRanking = function (score) {
    return new Promise((resolve, reject) => {
        const Ranking = Parse.Object.extend("Ranking");

        let query = new Parse.Query(Ranking);
        query.equalTo('Email', score.geocacheur.get("Email"));
        query.first().then((ranking) => {
            if (ranking == null) {
                console.log("New ranking for " + score.geocacheur.get("Email"));

                let ranking = new Ranking();
                ranking.save({
                    Geocacheur: score.geocacheur,
                    Email: score.geocacheur.get("Email"),
                    Active: true
                });
                console.log("Created ranking for " + score.geocacheur.get("Email"));

                resolve(ranking);
            } else {
                console.log("Ranking found - Updating");

                ranking.set("FTF", score.scoreCaches.FTF);
                ranking.set("STF", score.scoreCaches.STF);
                ranking.set("TTF", score.scoreCaches.TTF);
                ranking.set("ScoreFTF", score.scoreCaches.ScoreFTF);
                ranking.set("ScoreDT", score.scoreCaches.ScoreDT);
                ranking.set("ScoreDT", score.scoreCaches.ScoreCache);
                ranking.set("Score", score.scoreCaches.total);
                ranking.set("Found", score.scoreCaches.found);

                ranking.save(null);
                resolve(ranking);
            }
        }, (error) => {
            reject(error);
        });
    });
};

const saveOrUpdateGeocacheur = function (email, pseudo, active) {
    return new Promise((resolve, reject) => {
        const Ranking = Parse.Object.extend("Ranking");
        let queryRanking = new Parse.Query(Ranking);

        const Geocacheur = Parse.Object.extend("Geocacheur");
        let query = new Parse.Query(Geocacheur);
        query.equalTo('Email', email);
        query.first().then((geocacheur) => {
            if (geocacheur) {
                console.log("Geocacheur found - Updating");
                geocacheur.set("Pseudo", pseudo);
                geocacheur.set("Active", active);
                geocacheur.set("Enrollment", "updated");
                geocacheur.save(null).then(function () {
                    queryRanking.equalTo('Geocacheur', geocacheur);
                    queryRanking.first().then((rank) => {
                        if (rank) {
                            rank.set("Active", active);
                            rank.save(null).then(function () {
                                resolve(geocacheur);
                            }, (error) => {
                                reject(error);
                            });
                        } else {
                            saveRanking(geocacheur, active).then(function () {
                                resolve(geocacheur);
                            }, (error) => {
                                reject(error);
                            });
                        }
                    }, (error) => {
                        reject(error);
                    });
                }, (error) => {
                    reject(error);
                });
            } else {
                console.log("Geocacheur was not found - Saving");
                const geocacheur = new Geocacheur();
                geocacheur.save({
                    Email: email,
                    Pseudo: pseudo,
                    Company: '',
                    Enrollment: 'new',
                    Active: active
                }).then((geocacheur) => {
                    saveRanking(geocacheur, active).then(function () {
                        resolve(geocacheur);
                    }, (error) => {
                        reject(error);
                    });
                }, (error) => {
                    reject(error);
                });
            }
        }, (error) => {
            console.error("Error searching for Geocacheur with email: " + email + " Error: " + error);
            reject(error);
        });
    });
};

function getLogsByEmail(emailString) {
    console.log("getLogsByEmail : " + emailString);
    return new Promise((resolve, reject) => {
        const email = emailString.toLowerCase();
        const Logs = Parse.Object.extend("Log");
        let query = new Parse.Query(Logs);
        query.equalTo("Email", email);
        query.ascending("createdAt");
        query.equalTo("Active", true);
        query.include('Geocache');
        query.greaterThanOrEqualTo("createdAt", new Date(starting_jds_date));
        query.limit(10000);
        query.find().then((logs) => {
            console.log("getLogsByEmail trouvés : " + logs.length);
            resolve(logs);
        }, (error) => {
            console.log("Erreur pendant recherche logs " + emailString);
            reject(error);
        });
    });
}

module.exports.generateCodeId = generateCodeId;
module.exports.generateAdminId = generateAdminId;
module.exports.createThumbnail = createThumbnail;
module.exports.generateQRCode = generateQRCode;
module.exports.getGeocache = getGeocache;
module.exports.getGeocacheWithCodeId = getGeocacheWithCodeId;
module.exports.getGeocacheWithAdminId = getGeocacheWithAdminId;
module.exports.getLogWithEmailAndCache = getLogWithEmailAndCache;
module.exports.getAllActiveLogWithCache = getAllActiveLogWithCache;
module.exports.getGeocacheurWithEmail = getGeocacheurWithEmail;
module.exports.hasEmailFoundGeocache = hasEmailFoundGeocache;
module.exports.saveOrUpdateGeocacheur = saveOrUpdateGeocacheur;
module.exports.getLastLogs = getLastLogs;
module.exports.getAllPublishedGeocaches = getAllPublishedGeocaches;
module.exports.getGeocachesByOwnerEmail = getGeocachesByOwnerEmail;
module.exports.saveRanking = saveRanking;
module.exports.getAllActiveRanking = getAllActiveRanking;
module.exports.getLogsByEmail = getLogsByEmail;
module.exports.saveOrUpdateRanking = saveOrUpdateRanking;
module.exports.computeScoreForGeocacheur = computeScoreForGeocacheur;
module.exports.checkCoordinates = checkCoordinates;
module.exports.sendToSlack = sendToSlack;
