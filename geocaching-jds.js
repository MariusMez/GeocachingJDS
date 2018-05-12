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
    query.exists("PhotoUrl");
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
