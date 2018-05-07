var getGeocacheWithCodeId = function(geocacheCodeId) {
    var promise = new Parse.Promise();

    var Geocache = Parse.Object.extend("Geocache");
	var query = new Parse.Query(Geocache);
    query.equalTo("codeId", geocacheCodeId);
    query.first().then(function(result) {
        if(result) {
            promise.resolve(result);
        } else {
            console.log("Geocache ID: " + geocacheCodeId + " was not found");
            promise.resolve(null);
        }
    }, function(error) {
        console.error("Error searching for Geocache with id: " + geocacheCodeId + " Error: " + error);
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
            console.log("TravelbugCode Code: " + code + " was not found");
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
            console.log("Log was not found");
            promise.resolve(null);
        }
    }, function(error) {
        console.error("Error searching for Log with email: " + email + " Error: " + error);
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
            console.log("Geocacheur was not found");
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
            console.log("No Travelbugs in Geocache");
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
            console.log("Owner " + email + " doesn't own any Travelbugs");
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
            console.log("No Travelbugs in hands");
            promise.resolve(null);
        }
    }, function(error) {
        console.error("Error searching for Travelbug in holder hands: " + email + " Error: " + error);
        promise.error(error);
    });

    return promise;
}

var saveOrUpdateGeocacheur = function(email, pseudo, active) {
    var promise = new Parse.Promise();

    var Geocacheur = Parse.Object.extend("Geocacheur");
    var query = new Parse.Query(Geocacheur);
    query.equalTo('Email', email);
    query.first().then(function(result) {
        if(result) {
            console.log("Geocacheur found - Updating");
            result.set("Pseudo", pseudo);
            result.set("Active", active);
            result.set("Enrollment", "updated");
            result.save(null).then(function() {
                promise.resolve(result)
            }, function(error) {
                console.error(error)
                promise.resolve(null)
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
                    promise.resolve(geocacheur);
                },
                error: function(error) {
                    console.error(error)
                    promise.resolve(null);
                }
            });
        }
    }, function(error) {
        console.error("Error searching for Geocacheur with email: " + email + " Error: " + error);
        promise.error(error);
    });

    return promise;
}

module.exports.getGeocacheWithCodeId = getGeocacheWithCodeId;
module.exports.getInactiveTravelbugCodeWithCode = getInactiveTravelbugCodeWithCode;
module.exports.getLogWithEmailAndCache = getLogWithEmailAndCache;
module.exports.getGeocacheurWithEmail = getGeocacheurWithEmail;
module.exports.getAllTravelbugsInCache = getAllTravelbugsInCache;
module.exports.getAllTravelbugsWithOwnerEmail = getAllTravelbugsWithOwnerEmail;
module.exports.getAllTravelbugsInHands = getAllTravelbugsInHands;
module.exports.saveOrUpdateGeocacheur = saveOrUpdateGeocacheur;
