const jds = require('../geocaching-jds');
const csv = require('csv');
const fs = require('fs');
const mailer = require('nodemailer');

const starting_jds_date = "2019-03-20";

Parse.Cloud.beforeSave("Log", async (request) => {
    if(request.object.isNew()) {
        const photo = request.object.get("Photo");
        if(photo) {
            const maxWidth = 1000;
            const maxHeight = 1000;
            let response = await Parse.Cloud.httpRequest({ url: photo.url() });
            let thumbnail = await jds.createThumbnail(response.buffer, maxWidth, maxHeight, 'jpeg');
            if(thumbnail) {
                request.object.set("Photo", thumbnail);
                request.object.set("PhotoUrl", thumbnail.url({forceSecure: true}));
            }
        }
    }
});

async function base64_encode(file) {
    let bitmap = fs.readFileSync(file);
    return new Buffer.from(bitmap).toString('base64');
}

Parse.Cloud.job("Import participants 2019 from CSV file", async (request) => {
    request.message("I just started");
    const obj = csv();
    const Geocacheur = Parse.Object.extend("Geocacheur");
    const Geocache = Parse.Object.extend("Geocache");
    const Ranking = Parse.Object.extend("Ranking");

    const spoiler_img = new Parse.File("nospoiler.png", { base64: await base64_encode(__dirname + '/../public/images/nospoiler.png') });
    const photo_img = new Parse.File("logo_jds.png", { base64: await base64_encode(__dirname + '/../public/images/logo_jds.png') });

    obj.from.path('Geocacheurs2019.csv').to.array(function(geocacheurs) {
        geocacheurs.forEach( async (geocacheur) => {
            const pseudo = geocacheur[0];
            const companyname = geocacheur[1];
            const email = geocacheur[2].toLowerCase();

            let query = new Parse.Query(Geocacheur);
            query.equalTo('Email', email);
            const result = await query.first();

            if(result === undefined) {
                let g = new Geocacheur();
                g.save({
                    Email: email,
                    Pseudo: pseudo,
                    Company: companyname,
                    Enrollment: "preload",
                    Active: true
                }).then(async (user) => {
                    const email = user.get("Email");
                    let query = new Parse.Query(Geocache);
                    query.equalTo('OwnerEmail', email);
                    const result = await query.first();

                    if(result === undefined) {
                        let geocache = new Geocache();
                        geocache.set("Owner", pseudo);
                        geocache.set("OwnerEmail", email);
                        geocache.set("Active", false);
                        geocache.set("Fav", 0);
                        geocache.set("RatioFav", 0);
                        geocache.set("codeId", await jds.generateCodeId());
                        geocache.set("adminId", await jds.generateAdminId());
                        geocache.set("Spoiler", spoiler_img);
                        geocache.set("Photo", photo_img);
                        geocache.save().then((geocache) => {
                            console.log(`Geocache created for user ${email}`);
                            let queryRanking = new Parse.Query(Ranking);
                            queryRanking.equalTo('Geocacheur', user);
                            queryRanking.first().then((res) => {
                                if (res === undefined) {
                                    jds.saveRanking(user, true).then(function() { }, function(error) { });
                                } else {
                                    // Update ranking ?
                                    console.log("Update ranking");
                                }
                            }, (error) => {
                                console.error(error);
                            });

                        }, (error) => {
                            console.error(error);
                        });
                    } else {
                        console.log(`Geocache exist for user ${email}, we do nothing`);
                    }
                }, (error) => {
                    console.error(error);
                });
            } else {
                console.log(`Geocacheur ${email} exist, we do nothing`);
            }
        });
    });
    request.message("I just finished");
});


Parse.Cloud.job("First - Compute Score Ratio D/T", (request) => {
    request.message("I just started Compute Ratio D/T");

    const Logs = Parse.Object.extend("Log");
    const Ranking = Parse.Object.extend("Ranking");

    let queryRanking = new Parse.Query(Ranking);
    queryRanking.equalTo("Active", true);
    queryRanking.limit(1000);
    queryRanking.find().then((ranking) => {
        ranking.forEach((rank) => {
            let query = new Parse.Query(Logs);
            query.equalTo("Email", rank.get("Email"));
            query.equalTo("Active", true);
            query.greaterThanOrEqualTo("createdAt", new Date(starting_jds_date));
            query.limit(100000);
            query.include('Geocache');
            query.find().then(function(logs) {
                let promise = Parse.Promise.as();
                let scoreDT = 0;
                logs.forEach(function(log) {
                    promise = promise.then(function() {
                        scoreDT = scoreDT + log.get("Geocache").get("Difficulty") + log.get("Geocache").get("Terrain");
                        return scoreDT;
                    });
                });
                return promise;

            }).then((scoreDT) => {
                rank.set("ScoreDT", scoreDT);
                rank.save(null);
            });
        });
    }).then((result) => {
        request.message("I just finished");
    }, (error) => {
        console.error(error);
    });
});


Parse.Cloud.job("Compute Fav Points", async (request) => {
    request.message("I just started Compute Fav Points");

    const Logs = Parse.Object.extend("Log");
    const Geocache = Parse.Object.extend("Geocache");

    let queryGeocaches = new Parse.Query(Geocache);
    queryGeocaches.limit(1000);
    queryGeocaches.equalTo("Active", true);
    queryGeocaches.find().then(async (geocaches) => {
        geocaches.forEach(async (geocache) => {
            let query = new Parse.Query(Logs);
            query.equalTo("Active", true);
            query.limit(100000);
            query.equalTo("Geocache", geocache);
            query.equalTo("Fav", true);
            query.count().then(async (counter) => {
                geocache.set("Fav", counter);
                await geocache.save(null);
            });
        });
    }).then((result) =>{
        request.message("I just finished");
    }, (error) => {
        console.error(error);
    });
});

Parse.Cloud.job("Compute Fav Ratio", async (request) => {
    request.message("I just started Compute Fav Ratio");

    const Logs = Parse.Object.extend("Log");
    const Geocache = Parse.Object.extend("Geocache");

    let queryGeocaches = new Parse.Query(Geocache);
    queryGeocaches.equalTo("Active", true);
    queryGeocaches.find().then((geocaches) => {
        geocaches.forEach((geocache) => {
            let query = new Parse.Query(Logs);
            query.equalTo("Active", true);
            query.limit(100000);
            query.equalTo("Geocache", geocache);
            query.count().then(async (counter) => {
                let nbFav = geocache.get("Fav");
                let ratio =  Math.round((nbFav / counter) * 100);
                geocache.set("RatioFav", ratio);
                await geocache.save(null);
            });
        });
    }).then((result) => {
        request.message("I just finished");
    }, function(error) {
        console.error(error);
    });
});

Parse.Cloud.job("Compute All rankings", (request) => {
    request.message("I just started Compute All Rankings");
    const Geocacheur = Parse.Object.extend("Geocacheur");
    let queryGeocacheurs = new Parse.Query(Geocacheur);
    queryGeocacheurs.equalTo("Active", true);
    queryGeocacheurs.limit(1000);
    queryGeocacheurs.find().then((geocacheurs) => {
        let promisesScores = [];
        let counter = 0;
        geocacheurs.forEach((geocacheur) => {
            counter = counter + 1;
            const email = geocacheur.get("Email");
            request.message("Processing " + email + " " + counter + "/" + geocacheurs.length);
            console.log("Processing " + email + " " + counter + "/" + geocacheurs.length);
            promisesScores.push(jds.computeScoreForGeocacheur(email));
        });

        return Parse.Promise.all(promisesScores);
    }).then((scores) => {
        console.log("in function with " + scores.length + " scores ");
        let promisesStore = [];
        let counter = 0;
        scores.forEach((score) => {
            counter = counter + 1;
            const email = score.geocacheur.get("Email");
            request.message("Storing " + email + " - " + counter + "/" + scores.length);
            console.log("Storing " + email + " - " + counter + "/" + scores.length);

            promisesStore.push(jds.saveOrUpdateRanking2(score));
        });
        return Parse.Promise.all(promisesStore);
    }).then((results) => {
        console.log("termine with " + results.length);
        request.message("I just finished");
    }, (error) => {
        console.error(error);
    });
});

Parse.Cloud.job("Last - Compute Ranking", async (request) => {
    request.message("I just started Compute Ranking");
    const scoreFoundIt = 20;
    const scoreFTF = 3;
    const scoreSTF = 2;
    const scoreTTF = 1;

    const Logs = Parse.Object.extend("Log");
    const Ranking = Parse.Object.extend("Ranking");

    let queryRanking = new Parse.Query(Ranking);
    queryRanking.equalTo("Active", true);
    queryRanking.limit(1000);
    queryRanking.find().then((rankings) => {
        rankings.forEach((rank) => {
            let query = new Parse.Query(Logs);
            query.equalTo("Email", rank.get("Email"));
            query.equalTo("Active", true);
            query.greaterThanOrEqualTo("createdAt", new Date(starting_jds_date));
            query.limit(10000);
            query.count().then(async (counter) => {
                let scoreFTFSTFTTF = rank.get("FTF") * scoreFTF + rank.get("STF") * scoreSTF + rank.get("TTF") * scoreTTF;
                let score = counter * scoreFoundIt + scoreFTFSTFTTF + rank.get("ScoreDT") + rank.get("ScoreCache");
                rank.set("Found", counter);
                rank.set("Score", score);
                rank.set("ScoreFTF", scoreFTFSTFTTF);
                await rank.save(null);
            });
        });
    }).then((result) => {
        request.message("I just finished");
    }, function(error) {
        console.error(error);
    });
});

/**
 * Sending 2019 launch email campaign
 * 
 * You will have to deactivate some restrictions from your Google account in order to use Gmail :
 * - https://accounts.google.com/b/0/DisplayUnlockCaptcha
 * - https://myaccount.google.com/lesssecureapps
 * 
 * @todo Better management of the promises / error cases
 */
Parse.Cloud.job("Send launch emails to participants 2019", async (request) => {
    request.message("I just started sending the emails");
    
    let sTemplate = fs.readFileSync('cloud/views/mails/launch2019.html', 'utf8');
    let oTransportConfig = {
        pool: true,
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT, 10),
        secure: process.env.EMAIL_SECURE_SSL,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        tls: {
            // do not fail on invalid certs
            rejectUnauthorized: false
        }
    };
    let oTransporter = mailer.createTransport(oTransportConfig);
    console.log(oTransportConfig);

    const Geocache = Parse.Object.extend("Geocache");
    let queryGeocaches = new Parse.Query(Geocache);
    queryGeocaches.notEqualTo("adminId", null);
    queryGeocaches.notEqualTo("adminId", "");
    //queryGeocaches.equalTo("OwnerEmail", "testmail@gmail.com");
    queryGeocaches.greaterThanOrEqualTo("createdAt", new Date(starting_jds_date));
    queryGeocaches.limit(1000);
    queryGeocaches.find().then(async (geocaches) => {
        let counter = 0;
        geocaches.forEach(async (geocache) => {
            counter = counter + 1;
            const email = geocache.get("OwnerEmail");
            const adminLink = "https://www.geocaching-jds.fr/create?admin_id=" + geocache.get("adminId");
            
            request.message("Processing " + email + " " + counter + "/" + geocaches.length);
            console.log("Processing " + email + " (" + counter + "/" + geocaches.length + ")");
            
            let oMailOptions = {
                from: process.env.EMAIL_FROM,
                to: email,
                subject: "Lancement épreuve Géocaching JDS 2019",
                html: sTemplate.replace(/{ADMIN_LINK}/g, adminLink)
            };
            await oTransporter.sendMail(oMailOptions, function(error, info){
                if (error) {
                    console.log("Sending email to " + email + " FAILED !!! (retry manually)");
                    console.log(error);
                } else {
                    console.log("Email sent to " + email + " (" + info.response + ")");
                }
            });
        });
        
    }).then((results) => {
        console.log("Mailing campaign sent (returned: " + results + ")");
        request.message("I just finished");
    }, (error) => {
        console.error(error);
    });
});
