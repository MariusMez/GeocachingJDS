var createThumbnail = function createThumbnail(image_buffer, maxWidth, maxHeight) {
    const sharp = require('sharp');
    return sharp(image_buffer).resize(maxWidth, maxHeight)
                              .max()
                              .withoutEnlargement()
                              .toFormat('jpeg')
                              .toBuffer()
                              .then(function(buffer_img) { 
                                    console.log("Generating Thumbnail...");
                                    var thumb = new Parse.File("thumbnail.jpg", { base64: buffer_img.toString('base64') });
                                    return thumb.save();
                               }).then(function(thumbnail) {
                                    return thumbnail;
                               }, function(error) {
                                    console.log("Thumbnail generation error: " + error.message);
                                    return;
                               });
};


var getGeocache = function(id) {
    var promise = new Parse.Promise();

    var Geocache = Parse.Object.extend("Geocache");
    var query = new Parse.Query(Geocache);
    query.get(id).then(function(result) {
        if(result) {
            promise.resolve(result);
        } else {
            promise.resolve(null);
        }
    }, function(error) {
        console.error("Error searching for Geocache with id: " + id + " Error: " + error);
        promise.error(error);
    });

    return promise;
}

var getGeocacheWithCodeId = function(geocacheCodeId) {
    var promise = new Parse.Promise();

    var Geocache = Parse.Object.extend("Geocache");
	var query = new Parse.Query(Geocache);
    query.equalTo("codeId", geocacheCodeId);
    query.first().then(function(result) {
        if(result) {
            promise.resolve(result);
        } else {
            promise.resolve(null);
        }
    }, function(error) {
        console.error("Error searching for Geocache with CodeId: " + geocacheCodeId + " Error: " + error);
        promise.error(error);
    });

    return promise;
}

var getAllPublishedGeocaches = function(descending) {
    var promise = new Parse.Promise();

    var Geocaches = Parse.Object.extend("Geocache");
    var query = new Parse.Query(Geocaches);
    query.equalTo("Active",true);
    query.lessThanOrEqualTo("Publication", new Date());
    query.descending(descending);
    query.limit(1000);
    query.find().then(function(results) {
        if(results) {
            promise.resolve(results);
        } else {
            promise.resolve(null);
        }
    }, function(error) {
        console.error("Error searching for published Geocaches - Error: " + error);
        promise.error(error);
    });

    return promise;
}

var getLastLogs = function(limit) {
    var promise = new Parse.Promise();

    var Log = Parse.Object.extend("Log");
    var query = new Parse.Query(Log);
    query.descending("createdAt");
    query.equalTo("Active", true);
    query.limit(limit); 
    query.include("Geocache");
    query.find().then(function(results) {
        if(results) {
            promise.resolve(results);
        } else {
            promise.resolve(null);
        }
    }, function(error) {
        console.error("Error searching for Logs - Error: " + error);
        promise.error(error);
    });

    return promise;
}

var getTravelbugWithTrackingCode = function(trackingCode) {
    var promise = new Parse.Promise();

    var Travelbug = Parse.Object.extend("Travelbug");
    var query = new Parse.Query(Travelbug);
    query.equalTo("Code", trackingCode);
    query.equalTo("Active", true);
    query.first().then(function(result) {
        if(result) {
            promise.resolve(result);
        } else {
            promise.resolve(null);
        }
    }, function(error) {
        console.error("Error searching for Travelbug with tracking code: " + trackingCode + " Error: " + error);
        promise.error(error);
    });

    return promise;
}

var getInactiveTravelbugCodeWithCode = function(code) {
    var promise = new Parse.Promise();

    var TravelbugCode = Parse.Object.extend("TravelbugCode");
    var query = new Parse.Query(TravelbugCode);
    query.equalTo("Code", code);
    query.equalTo("Active", false);
    query.first().then(function(result) {
        if(result) {
            promise.resolve(result);
        } else {
            promise.resolve(null);
        }
    }, function(error) {
        console.error("Error searching for TravelbugCode with code: " + code + " Error: " + error);
        promise.error(error);
    });

    return promise;
}

var getLogWithEmailAndCache = function(email, geocache) {
    var promise = new Parse.Promise();
    
    var Logs = Parse.Object.extend("Log");    
    var query = new Parse.Query(Logs);
    query.equalTo("Email", email);
    query.equalTo("Geocache", geocache);
    query.equalTo("Active", true);
    query.first().then(function(result) {
        if(result) {
            promise.resolve(result);
        } else {
            promise.resolve(null);
        }
    }, function(error) {
        console.error("Error searching for Log with email: " + email + " Error: " + error);
        promise.error(error);
    });

    return promise;
}

var getAllActiveLogWithCache = function(geocache) {
    var promise = new Parse.Promise();
    
    var Logs = Parse.Object.extend("Log");    
    var query = new Parse.Query(Logs);
    query.descending("createdAt");
    query.equalTo("Active", true);
    query.equalTo("Geocache", geocache);
    query.find().then(function(results) {
        if(results) {
            promise.resolve(results);
        } else {
            promise.resolve(null);
        }
    }, function(error) {
        console.error("Error searching for Log with cache: " + geocache.id + " Error: " + error);
        promise.error(error);
    });

    return promise;
}

var getGeocacheurWithEmail = function(email) {
    console.log("getGeocacheurWithEmail " + email);
    var promise = new Parse.Promise();
    
    var Geocacheur = Parse.Object.extend("Geocacheur");    
    var query = new Parse.Query(Geocacheur);
    query.equalTo("Email", email);
    query.first().then(function(result) {
        if(result) {
            promise.resolve(result);
        } else {
            promise.resolve(null);
        }
    }, function(error) {
        console.error("Error searching for Geocacheur with email: " + email + " Error: " + error);
        promise.error(error);
    });

    return promise;
}

var getAllTravelbugsInCache = function(geocache) {
    var promise = new Parse.Promise();

    var Travelbug = Parse.Object.extend("Travelbug");
    var query = new Parse.Query(Travelbug);
    query.equalTo("cacheId", geocache.id);
    query.equalTo("Active", true);
    query.descending("createdAt");
    query.find().then(function(results) {
        if(results) {
            promise.resolve(results);
        } else {
            promise.resolve(null);
        }
    }, function(error) {
        console.error("Error searching for Travelbug in geocache: " + geocache.id + " Error: " + error);
        promise.error(error);
    });

    return promise;
}

var getAllTravelbugsWithOwnerEmail = function(email) {
    var promise = new Parse.Promise();

    var Travelbug = Parse.Object.extend("Travelbug");
    var query = new Parse.Query(Travelbug);
    query.equalTo("OwnerEmail", email);
    query.equalTo("Active", true);
    query.descending("createdAt");
    query.find().then(function(results) {
        if(results) {
            promise.resolve(results);
        } else {
            promise.resolve(null);
        }
    }, function(error) {
        console.error("Error searching for Travelbug possessed by Owner with email: " + email + " Error: " + error);
        promise.error(error);
    });

    return promise;
}

var getAllTravelbugsInHands = function(email) {
    var promise = new Parse.Promise();
    
    var Travelbug = Parse.Object.extend("Travelbug");
    var query = new Parse.Query(Travelbug);
    query.equalTo("HolderEmail", email);
    query.equalTo("Active", true);
    query.descending("createdAt");
    query.find().then(function(results) {
        if(results) {
            promise.resolve(results);
        } else {
            promise.resolve(null);
        }
    }, function(error) {
        console.error("Error searching for Travelbug in holder hands: " + email + " Error: " + error);
        promise.error(error);
    });

    return promise;
}

var hasEmailFoundGeocache = function(email, geocache) {
    var promise = new Parse.Promise();
    
    var Log = Parse.Object.extend('Log');
    var query = new Parse.Query(Log);
    query.equalTo("Email", email);
    query.equalTo("Geocache", geocache);
    query.equalTo("Active", true);
    query.first().then(function(result) {
        if(result) {
            promise.resolve(result);
        } else {
            promise.resolve(null);
        }
    }, function(error) {
        console.error("Error searching for Log with: " + email + " Error: " + error);
        promise.error(error);
    });

    return promise;
}

var getAllActiveRanking = function(descending) {
    var promise = new Parse.Promise();
    
    var Ranking = Parse.Object.extend("Ranking");
    var query = new Parse.Query(Ranking);
    query.descending(descending);
    query.equalTo("Active", true);
    query.include("Geocacheur");
    query.limit(1000);
    query.find().then(function(results) {
        if(results) {
            promise.resolve(results);
        } else {
            promise.resolve(null);
        }
    }, function(error) {
        promise.error(error);
    });

    return promise;
}

var saveRanking = function(geocacheur, active) {
    var promise = new Parse.Promise();
    
    var Ranking = Parse.Object.extend("Ranking");
    var ranking = new Ranking();
    ranking.set("Geocacheur", geocacheur);
    ranking.set("Email", geocacheur.get("Email"));
    ranking.set("FTF", 0);
    ranking.set("STF", 0);
    ranking.set("TTF", 0);
    ranking.set("ScoreFTF", 0);
    ranking.set("ScoreTB", 0);
    ranking.set("ScoreDT", 0);
    ranking.set("Score", 0);
    ranking.set("Found", 0);
    ranking.set("Active", active);
    ranking.save(null).then(function() {
        promise.resolve(ranking);
    }, function(error) {
        promise.error(error);
    });

    return promise;
}

var computeScoreForGeocacheur = function(email) {

    console.log("computeScoreForGeocacheur " + email );

    var promise = new Parse.Promise();

    const nbPointsFoundIt = 20;
    const nbPointsFTF = 3;
    const nbPointsSTF = 2;
    const nbPointsTTF = 1;
    const nbPointsFavTB = 2;
    const nbPointsMission = 5;
    const nbPointsNewTBDiscover = 10;
    const nbPointsFirstCacheVisit = 10;
    const nbPointsTBOwnerByMove = 2;

    var promiseGeocacheur = getGeocacheurWithEmail(email);
    var promiseLogs = getLogsByEmail(email);
    var promiseTbLogsByEmail = getTbLogsByEmail(email);
    var promiseTbOfGeocacheur = getTbOfGeocacheur(email);

    Parse.Promise.all([promiseGeocacheur, promiseLogs, promiseTbLogsByEmail, promiseTbOfGeocacheur])
    .then(
        function(values) { 

            var geocacheur = values[0];
            var mylogs = values[1];
            var tbLogs = values[2];
            var tbOwned = values[3];

            var scoreCaches = { found:0, FTF:0, STF:0, TTF:0, ScoreFTF:0, ScoreDT:0, ScoreFound:0, total:0, caches:[]};
            var scoreTb = { newVisits:0, newTbs:0, missions:0, total:0, tbs: {}};
            var scoreMyTb = { fav: 0, moves: 0, totalMoves:0, total:0, drops: {}}

            // logs caches
            mylogs.forEach(function(log) {
                var cache = {id: log.get("Geocache").id, name: log.get("Geocache").get("Nom"), diff: log.get("Geocache").get("Difficulty"), terrain: log.get("Geocache").get("Terrain") };
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

                scoreCaches.caches.push( cache);
            });

            // TB 
            tbLogs.forEach(function(log) {
                var tb = {id : log.get("Travelbug").id, name: log.get("Travelbug").get("Name")}

                if (scoreTb.tbs[tb.id] == undefined) {
                    //premiere visite?
                    if (log.get("NewCache") > 0) {
                        tb.newCache = "Premiere visite dans " + log.get("cacheName");
                    } else {
                        tb.newCache = "Pas une premiere visite de la cache " + log.get("cacheName");
                    }
                    scoreTb.newVisits = scoreTb.newVisits + log.get("NewCache");

                    // mission
                    if (log.get("Mission") != undefined && log.get("Mission") == "1") {
                        scoreTb.missions = scoreTb.missions + 1*log.get("Mission");   
                        tb.mission = "✔️ Réalisée";                      
                    } else {
                        tb.mission = "❌ Non réalisée";
                    }

                    tb.visites = 1;
                    scoreTb.newTbs = scoreTb.newTbs + log.get("NewTB");
                    scoreTb.tbs[tb.id] = tb;
                } else {
                    scoreTb.tbs[tb.id].visites = scoreTb.tbs[tb.id].visites + 1;
                }       

            }); 

            var promiseOwnedTbLogsByEmail = getLogsForTB(tbOwned.id);
            Parse.Promise.when([promiseOwnedTbLogsByEmail])
            .then(
                function(result) {
                    var ownedLogs = result[0]; 
                    
                    // TB owned
                    ownedLogs.forEach(function(log) {
                        var drop = {id : log.get("Travelbug").id, email: log.get("Email")}

                        if (scoreMyTb.drops[drop.email] == undefined) {
                            // on prend que le premier log par qqun du tb
                            scoreMyTb.moves = scoreMyTb.moves + nbPointsTBOwnerByMove;
                            scoreMyTb.fav = scoreMyTb.fav + log.get("Fav") * nbPointsFavTB; 
                            scoreMyTb.drops[drop.email] = drop;
                        } 
                        scoreMyTb.totalMoves =  scoreMyTb.totalMoves + 1;   
                    }); 

                    scoreCaches.total = scoreCaches.ScoreFTF + scoreCaches.ScoreDT + scoreCaches.ScoreFound;
                    scoreTb.total = scoreTb.newTbs*nbPointsNewTBDiscover + scoreTb.newVisits*nbPointsFirstCacheVisit + scoreTb.missions * nbPointsMission;
                    scoreMyTb.total = scoreMyTb.moves + scoreMyTb.fav;

                    var result = {geocacheur:geocacheur, scoreCaches: scoreCaches, scoreTb: scoreTb, scoreMyTb: scoreMyTb};

                    promise.resolve(result);

                }
            )
            .catch(
                function(error) {
                    console.error(error);
                    throw error;
                }  
            );
        })
    .catch(
        function(error) {
            console.error(error);
            throw error;
        }
    );

    return promise;

}

var saveOrUpdateRanking2 = function(score) {
    var promise = new Parse.Promise();
    
    var Ranking = Parse.Object.extend("Ranking");

    var query = new Parse.Query(Ranking);
    query.equalTo('Email', score.geocacheur.get("Email"));
    query.first().then(function(ranking) {
        if(ranking == null) {
            console.log("New ranking for " + score.geocacheur.get("Email"));

            var ranking = new Ranking();

            ranking.save({
                Geocacheur: score.geocacheur,
                Email: score.geocacheur.get("Email"),
                Active: true
            });


            console.log("Created ranking for " + score.geocacheur.get("Email"));

            promise.resolve(ranking);

        } else {
            console.log("Ranking found - Updating");
           
            ranking.set("FTF", score.scoreCaches.FTF);
            ranking.set("STF", score.scoreCaches.STF);
            ranking.set("TTF", score.scoreCaches.TTF);
            ranking.set("ScoreFTF", score.scoreCaches.ScoreFTF);
            ranking.set("ScoreTB", score.scoreTb.total + score.scoreMyTb.total);
            ranking.set("ScoreDT", score.scoreCaches.ScoreDT);
            ranking.set("Score", score.scoreCaches.total + score.scoreTb.total + score.scoreMyTb.total);
            ranking.set("Found", score.scoreCaches.found);
            ranking.set("NbTB", score.scoreTb.newTbs);
            ranking.set("Missions", score.scoreTb.missions);
            ranking.set("TbNewCaches", score.scoreTb.newVisits);

            
            ranking.save();
            promise.resolve(ranking);
        }
    }, function(error) {
        promise.error(error);
    });

    return promise;
}

var saveOrUpdateGeocacheur = function(email, pseudo, active) {
    var promise = new Parse.Promise();

    var Ranking = Parse.Object.extend("Ranking");
    var queryRanking = new Parse.Query(Ranking);

    var Geocacheur = Parse.Object.extend("Geocacheur");
    var query = new Parse.Query(Geocacheur);
    query.equalTo('Email', email);
    query.first().then(function(geocacheur) {
        if(geocacheur) {
            console.log("Geocacheur found - Updating");
            geocacheur.set("Pseudo", pseudo);
            geocacheur.set("Active", active);
            geocacheur.set("Enrollment", "updated");
            geocacheur.save(null).then(function() {
                queryRanking.equalTo('Geocacheur', geocacheur);
                queryRanking.first().then(function(rank) {
                    if(rank) {
                        rank.set("Active", active);
                        rank.save(null).then(function() {
                            promise.resolve(geocacheur);
                        }, function(error) {
                            promise.error(error);
                        });
                    } else {
                        saveRanking(geocacheur, active).then(function() {
                            promise.resolve(geocacheur);
                        }, function(error) {
                            promise.error(error);
                        });
                    }
                }, function(error) {
                    promise.error(error);
                });
            }, function(error) {
                promise.error(error);
            });
        } else {
            console.log("Geocacheur was not found - Saving");
            var geocacheur = new Geocacheur();
            geocacheur.save({
                Email: email,
                Pseudo: pseudo,
                Company: '',
                Enrollment: 'new',
                Active: active
            }, {
                success: function(geocacheur) {
                    saveRanking(geocacheur, active).then(function() {
                        promise.resolve(geocacheur);
                    }, function(error) {
                        promise.error(error);
                    });
                },
                error: function(error) {
                    promise.error(error);
                }
            });
        }
    }, function(error) {
        console.error("Error searching for Geocacheur with email: " + email + " Error: " + error);
        promise.error(error);
    });

    return promise;
}

var isFirstTbDropOnGeocache = function(tb, geocache) {
    var promise = new Parse.Promise();

    var TravelbugLog = Parse.Object.extend("TravelbugLog");
    var query = new Parse.Query(TravelbugLog);
    query.descending("createdAt");
    query.equalTo("Active", true);
    query.equalTo("cacheId", geocache.id);
    query.equalTo("TravelbugId", tb.id);
    query.equalTo("Action", "drop");
    query.equalTo("NewTB", 1);
    query.count().then(function(result) {
        if(result > 0) {
            promise.resolve(false);
        } else {
            promise.resolve(true);
        }
    }, function(error) {
        promise.error(error);
    });

    return promise;
}

var isFirstTbDropByEmail = function(tb, email) {
    var promise = new Parse.Promise();

    var TravelbugLog = Parse.Object.extend("TravelbugLog");
    var query = new Parse.Query(TravelbugLog);
    query.descending("createdAt");
    query.equalTo("Active", true);
    query.equalTo("Email", email);
    query.equalTo("TravelbugId", tb.id);
    query.equalTo("Action", "drop");
    query.count().then(function(result) {
        if(result > 0) {
            promise.resolve(false);
        } else {
            promise.resolve(true);
        }
    }, function(error) {
        promise.error(error);
    });

    return promise;
}

var countTravelBugHoldByEmail = function(email) {
    var promise = new Parse.Promise();

    var Travelbug = Parse.Object.extend("Travelbug");
    var query = new Parse.Query(Travelbug);
    query.descending("createdAt");
    query.equalTo("Active", true);
    query.equalTo("HolderEmail", email);
    query.count().then(function(result) {
        if(result) {
            promise.resolve(result);
        } else {
            promise.resolve(result);
        }
    }, function(error) {
        promise.error(error);
    });

    return promise;
}

var getLastMissionToValidate = function() {
    var promise = new Parse.Promise();
    
    var TravelbugLog = Parse.Object.extend("TravelbugLog");
    var query = new Parse.Query(TravelbugLog);
    query.equalTo("Active", true);
    query.equalTo("MissionReviewed", false);
    query.exists("Photo");
    query.include("Travelbug");
    query.ascending("createdAt");
    query.first().then(function(result) {
        if(result) {
            promise.resolve(result);
        } else {
            promise.resolve(null);
        }
    }, function(error) {
        console.error("Error searching for Mission in TravelBugLog - Error: " + error);
        promise.error(error);
    });

    return promise;
}

var validateMission = function(missionId, validationScore) {
    var promise = new Parse.Promise();
    
    var TravelbugLog = Parse.Object.extend("TravelbugLog");
    var tblog = new TravelbugLog();
    tblog.id = missionId;
    tblog.set("MissionReviewed", true);
    tblog.set("Mission", validationScore);
    tblog.save(null).then(function() {
        promise.resolve(tblog);
    }, function(error) {
        promise.error(error);
    });

    return promise;
}


function getTbOfGeocacheur(emailString) {
    console.log("getTbOfGeocacheur : " + emailString);
    var promise = new Parse.Promise();
    
    var email = emailString.toLowerCase();
    var Travelbug = Parse.Object.extend("Travelbug");
    var queryTb = new Parse.Query(Travelbug);
    queryTb.equalTo("OwnerEmail", email);
    queryTb.equalTo("Active", true);
    queryTb.first({
        success: function(tb) {
            console.log("TB trouvé avec email " + emailString + " -- " + tb.id);
            promise.resolve(tb);
        }, 
        error: function(error) {
            console.log("TB n'existe pas avec email " + emailString) ;
            promise.error(error);
        }
    });
    
    return promise;
}

function getLogsByEmail(emailString) {
    console.log("getLogsByEmail : " + emailString);
    var promise = new Parse.Promise();

    var email = emailString.toLowerCase();
    var Logs = Parse.Object.extend("Log");
    var queryCaches = new Parse.Query(Logs);
    queryCaches.equalTo("Email", email);
    queryCaches.ascending("createdAt");
    queryCaches.equalTo("Active", true);
    queryCaches.include('Geocache');
    queryCaches.greaterThanOrEqualTo("createdAt", new Date("2018-05-01"));
    queryCaches.limit(10000);
    queryCaches.find({
        success: function(logs) {
            console.log("getLogsByEmail trouvés : " + logs.length);
            promise.resolve(logs);
        }, 
        error: function(error) {
            console.log("Erreur pendant recherche logs " + emailString) ;
            promise.error(error);
        }
    });

    return promise;
}

function getTbLogsByEmail(emailString) {
    console.log("getTbLogsByEmail : " + emailString);
    var promise = new Parse.Promise();

    var email = emailString.toLowerCase();

    var TravelbugLog = Parse.Object.extend("TravelbugLog");
    var queryTbs = new Parse.Query(TravelbugLog);
    queryTbs.equalTo("Active", true);
    queryTbs.equalTo("Action", "drop");
    queryTbs.ascending("createdAt");
    queryTbs.limit(10000);
    queryTbs.equalTo("Email", email);
    queryTbs.include("Travelbug");
    queryTbs.find({
        success: function(logs) {
            console.log("getTbLogsByEmail trouvés : "+ logs.length);
            promise.resolve(logs);
        }, 
        error: function(error) {
            console.log("Erreur pendant recherche logs TB " + emailString) ;
            promise.error(error);
        }
    });
    return promise;

}

function getLogsForTB(tbId) {
    console.log("getLogsForTB : " + tbId);
    var promise = new Parse.Promise();

    var TravelbugLog = Parse.Object.extend("TravelbugLog");
    var queryTbs = new Parse.Query(TravelbugLog);
    queryTbs.equalTo("Active", true);
    queryTbs.equalTo("Action", "drop");
    queryTbs.equalTo("TravelbugId", tbId);
    queryTbs.ascending("createdAt");
    queryTbs.include("Travelbug");
    queryTbs.find({
        success: function(logs) {
            console.log("getLogsForTB : " + tbId + " : " + logs.length);
            promise.resolve(logs);
        }, 
        error: function(error) {
            console.log("Erreur pendant recherche logs TB " + tbId) ;
            promise.error(error);
        }
    });
    
    return promise;
}

module.exports.createThumbnail = createThumbnail;
module.exports.getGeocache = getGeocache;
module.exports.getGeocacheWithCodeId = getGeocacheWithCodeId;
module.exports.getTravelbugWithTrackingCode = getTravelbugWithTrackingCode;
module.exports.getInactiveTravelbugCodeWithCode = getInactiveTravelbugCodeWithCode;
module.exports.getLogWithEmailAndCache = getLogWithEmailAndCache;
module.exports.getAllActiveLogWithCache = getAllActiveLogWithCache;
module.exports.getGeocacheurWithEmail = getGeocacheurWithEmail;
module.exports.getAllTravelbugsInCache = getAllTravelbugsInCache;
module.exports.getAllTravelbugsWithOwnerEmail = getAllTravelbugsWithOwnerEmail;
module.exports.getAllTravelbugsInHands = getAllTravelbugsInHands;
module.exports.hasEmailFoundGeocache = hasEmailFoundGeocache;
module.exports.saveOrUpdateGeocacheur = saveOrUpdateGeocacheur;
module.exports.isFirstTbDropOnGeocache = isFirstTbDropOnGeocache;
module.exports.isFirstTbDropByEmail = isFirstTbDropByEmail;
module.exports.countTravelBugHoldByEmail = countTravelBugHoldByEmail;
module.exports.getLastMissionToValidate = getLastMissionToValidate;
module.exports.validateMission = validateMission;
module.exports.getLastLogs = getLastLogs;
module.exports.getAllPublishedGeocaches = getAllPublishedGeocaches;
module.exports.saveRanking = saveRanking;
module.exports.getAllActiveRanking = getAllActiveRanking;
module.exports.getTbOfGeocacheur = getTbOfGeocacheur;
module.exports.getLogsByEmail = getLogsByEmail;
module.exports.getTbLogsByEmail = getTbLogsByEmail;
module.exports.getLogsForTB = getLogsForTB;
module.exports.saveOrUpdateRanking2 = saveOrUpdateRanking2;
module.exports.computeScoreForGeocacheur = computeScoreForGeocacheur;
