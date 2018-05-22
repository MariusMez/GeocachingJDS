// Since Node 8, have errors
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var express = require('express');
var bodyParser = require('body-parser');
var ParseServer = require('parse-server').ParseServer;
var path = require('path');
var multer = require('multer');

var Recaptcha = require('recaptcha-verify');
var recaptcha = new Recaptcha({
	secret: process.env.RECAPTCHA_SECRET_KEY,
	verbose: true
});

var fs = require('fs');
const sharp = require('sharp');
// var ca = [fs.readFileSync("/etc/letsencrypt/live/geocaching-jds.fr/fullchain.pem")];

var jds = require('./geocaching-jds');

var api = new ParseServer({
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

var app = express();
var upload = multer();

// Global app configuration section
app.set('views', 'cloud/views');  // Specify the folder to find templates
app.set('view engine', 'ejs');    // Set the template engine
// Serve static assets from the /public folder
app.use('/public', express.static(path.join(__dirname, '/public')));

// Serve the Parse API on the /parse URL prefix
var mountPath = process.env.PARSE_MOUNT || '/parse';
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

app.get('/register', function(req, res) {
	res.render('register');
});

app.post('/registerTb', upload.single('pic'), function(req, res, next) {

	var tracking_code = req.body.code.toUpperCase();
	var email = req.body.email.toLowerCase();
	var name = req.body.name;
	var description = req.body.description;
	var pseudo = req.body.pseudo;
	var mission = req.body.mission;
	var message = req.body.message;
	var photoFile = req.file;

	var Travelbug = Parse.Object.extend("Travelbug");
	var travelbug = new Travelbug();

	var TravelbugLog = Parse.Object.extend("TravelbugLog");
	var logEntry = new TravelbugLog(); 

	jds.getInactiveTravelbugCodeWithCode(tracking_code).then(function(tbcode) {
        if(tbcode) {
		  	// On vérifie que l'email n'a pas déjà un objet associé
			jds.getAllTravelbugsWithOwnerEmail(email).then(function(results) {
		        if(results.length > 0) {
			  		var error = "Il y a déjà un autre objet voyageur associé à l'adresse email " + email + "<br><br>"
			  				  + "Un seul objet voyageur par participant est autorisé, merci.";
					console.log(error);
					res.render('error', {message:error});
				} 
				else {
					if(photoFile) {
						var filename = photoFile.originalname;
						var photoFileBase64 = photoFile.buffer.toString('base64');
						var parseFile = new Parse.File(filename, {base64:photoFileBase64})

						parseFile.save().then(function() {
							var photo_url = parseFile.url({forceSecure: true})
							console.log("Photo saved in registerTb: " + photo_url);
							if(parseFile) {
								travelbug.set("PhotoUrl", photo_url);
								travelbug.set("Photo", parseFile);
							}
							travelbug.set("Name", name);
							travelbug.set("Code", tracking_code);
							travelbug.set("Description", description);
							travelbug.set("Owner", pseudo);
							travelbug.set("OwnerEmail", email);
							travelbug.set("Mission", mission);
							travelbug.set("CreatedAt", new Date());
							travelbug.set("cacheId", null); //id de la cache qui le contient . null si holder n'est pas null et reciproquement. 
							travelbug.set("cacheName", null);
							travelbug.set("Holder", pseudo);
							travelbug.set("HolderEmail", email);
							travelbug.set("Fav", 0);
							travelbug.set("Active", true);
							travelbug.save(null, {
								success: function() {
									console.log("Successfull TB created");
									logEntry.set("PhotoUrl", photo_url);
									logEntry.set("Photo", parseFile);
									logEntry.set("Travelbug", travelbug);
									logEntry.set("Pseudo", pseudo);
									logEntry.set("Email", email);
									logEntry.set("Message", message);
									logEntry.set("Date", new Date());
									logEntry.set("Action", "Created");
									logEntry.set("Active", true);
									logEntry.set("TravelbugId", travelbug.id);
									logEntry.set("TravelbugName", travelbug.get("Name"));
									logEntry.save(null, {
										success: function() {
											jds.saveOrUpdateGeocacheur(email, pseudo, true).then(function(geocacheur) {
										        if(geocacheur) {

										        	tbcode.set("Active", true);
													tbcode.save();
										            
										            res.render('tbregistered', { 
														tbid: travelbug.id, 
														message: "Bravo " + pseudo + " !<br><br>Votre objet voyageur " 
																 + name + " est bien enregistré. <br><br><br>"
															 	 + "Il est temps d'aller le poser dans une boite et de vous amuser"
															 	 + " à déplacer les objets voyageurs des autres participants !" 
															 	 + "<br><br>N'oubliez pas d'y attacher le code de suivi." });
										        } 
										        else {
										            console.error("Error during creation of geocacheur : " + error.message);
													res.render('error', { message:error.message });
										        }
										    }, function(error) {
										        console.error(error.message);
												res.render('error', { message:error.message });
										    });				
								        },
						                error: function(error) {
						                	console.error("Error TBlogEntry : " + error.message);
											res.render('error', { message:error.message });
						                }																									 
									});
								},
								error: function(error) {
									console.error("Error TBlogEntry : " + error.message);
									res.render('error', { message:error.message });
								}
							});	
						}, function(error) {
							console.error("Error saving photofile " + error.message);
							res.render('error', { message:error.message });
						});
					}
					else {
						var error = "Une photo de l'objet voyageur est requise.";
						console.error(error);
						res.render('error', { message:error });
					}
				}
		    }, function(error) {
		    	console.error(error.message);
				res.render('error', { message:error.message });
		    });
        } else {
   	  		var error = "Le code de suivi est incorrect ou déjà affecté à un autre objet voyageur.";
			console.error(error);
			res.render('error', { message:error });
        }
    }, function(error) {
        console.error(error.message);
		res.render('error', { message:error.message });
    });
});


app.get('/ranking', function(req, res) {
	var Ranking = Parse.Object.extend("Ranking");
	var queryGeocacheurs = new Parse.Query(Ranking);
	var Geocache = Parse.Object.extend("Geocache");
	var queryGeocaches = new Parse.Query(Geocache);
	
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
	var moment = require('./cloud/moment-with-locales.min.js');
	moment.locale('fr');
	app.locals.moment = moment;

	var startingDate = new Date("Sat, 19 May 2018 08:00:00 GMT");
	var now = Date.now();
	var start = false;
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


app.get('/photoscaches', function(req, res) {
	var page = req.query.page;
	if (page === undefined) {
		page = 1;
	}
	var max = 12;

	var Log = Parse.Object.extend("Log");
	var queryLog = new Parse.Query(Log);
	queryLog.descending("createdAt");
	queryLog.equalTo("Active", true);
	queryLog.exists("PhotoUrl");
	queryLog.count({
		success: function(count) {
			var skip = 0;
			if (count > max) { skip = (page - 1) * max; }

	    	var queryLog = new Parse.Query(Log);
			queryLog.descending("createdAt");
			queryLog.equalTo("Active", true);
			queryLog.exists("PhotoUrl");
			queryLog.limit(max);
			queryLog.skip(skip)
			queryLog.include("Geocache");
			queryLog.find({
				success: function(logs) {
					res.render('photos', { logs: logs, 
										   page: page,
										   pages: count / max });
				}
			});
	    },
	    error: function(error) {
	    	console.error(error.message);
	    	res.redirect('/');
	    }
	});
});

app.get('/photostbs', function(req, res) {
	var page = req.query.page;
	if (page === undefined) {
		page = 1;
	}
	var max = 12;

	var TravelbugLog = Parse.Object.extend("TravelbugLog");
	var queryLog = new Parse.Query(TravelbugLog);
	queryLog.descending("createdAt");
	queryLog.equalTo("Active", true);
	queryLog.exists("PhotoUrl");
	queryLog.count({
		success: function(count) {
			var skip = 0;
			if (count > max) { skip = (page - 1) * max; }

	    	var queryLog = new Parse.Query(TravelbugLog);
			queryLog.descending("createdAt");
			queryLog.equalTo("Active", true);
			queryLog.exists("PhotoUrl");
			queryLog.limit(max);
			queryLog.skip(skip)
			queryLog.find({
				success: function(logs) {
					res.render('photostbs', { logs: logs, 
										      page: page,
										      pages: count / max });
				},
			    error: function(error) {
			    	console.error(error.message);
	    			res.redirect('/');
			    }
			});
	    },
	    error: function(error) {
	    	console.error(error.message);
	    	res.redirect('/');
	    }
	});
});

app.get('/missionvalidator', function(req, res) {
	var accessKey = process.env.RECAPTCHA_SECRET_KEY;
	if(req.query.key === accessKey) {
		var moment = require('./cloud/moment-with-locales.min.js');
		moment.locale('fr');
		
		var shortDateFormat = "dddd @ HH:mm"; 
		app.locals.moment = moment; 
		app.locals.shortDateFormat = shortDateFormat;
		
		jds.getLastMissionToValidate().then(function(mission) {
	        if(mission) {
	            res.render('validatemission', { mission: mission, key:accessKey });
	        } else {
	            res.render('error', { message:"Pas de missions à Valider" }); 
	        }
	    }, function(error) {
	        console.error("Error in getAllMissionsToValidate: " + error);
	        res.render('error', { message: error.message });
	    });
	} else {
		res.redirect('/');
	}
});

app.get('/validatemission', function(req, res) {
	var accessKey = process.env.RECAPTCHA_SECRET_KEY;
	if(req.query.key === accessKey) {
		missionId = req.query.id;
		validationScore = req.query.score;

		jds.validateMission(missionId, validationScore).then(function(result) {
	        if(result) {
	            res.redirect('/missionvalidator?key=' + accessKey);
	        } else {
	            res.render('error', { message:"Mission introuvable" }); 
	        }
	    }, function(error) {
	        console.error("Error in validateMission: " + error);
	        res.render('error', { message: error.message });
	    });
	} else {
		res.redirect('/');
	}
});

app.get('/geocaching', function(req, res) {
	res.render('geocaching');
});

app.get('/tb', function(req, res) {
	var moment = require('./cloud/moment-with-locales.min.js');
	moment.locale('fr');
	
	var shortDateFormat = "dddd @ HH:mm";
	app.locals.moment = moment; 
	app.locals.shortDateFormat = shortDateFormat;

	var Travelbug = Parse.Object.extend("Travelbug");
	var query = new Parse.Query(Travelbug);
	query.get(req.query.id, {
		success: function(tb) {				 
			var tbName = tb.get("Name");
			var tbDescription = tb.get("Description");
			var tbOwner = tb.get("Owner");
			var photoUrl = tb.get("Photo").url({forceSecure: true}).replace(/^[a-zA-Z]{3,5}\:\/{2}[a-zA-Z0-9_.:-]+\//, '');
			var mission =  tb.get("Mission");
			var holder = tb.get("Holder");
			var cacheId = tb.get("cacheId");
			var cacheName = tb.get("cacheName");	
			var fav = tb.get("Fav");
			
			var data = new Array();
			var TravelbugLog = Parse.Object.extend("TravelbugLog");
			var queryTbsLogged = new Parse.Query(TravelbugLog);
			queryTbsLogged.descending("createdAt");
			queryTbsLogged.equalTo("Active", true);
			queryTbsLogged.equalTo("Travelbug", tb);
			queryTbsLogged.include("Geocache");
			queryTbsLogged.find({
				success: function(objetsLogged) {
					res.render('tb', { nom:tbName, id:req.query.id, description: tbDescription, 
							   owner:tbOwner, photo: photoUrl, holder: holder, fav:fav,
							   mission: mission, cacheId:cacheId, cacheName: cacheName, 
							   objetsLogged:objetsLogged });
				},
				error: function(object, error) {
					res.redirect('/geocaches');
				}
			});
		},
		error: function(object, error) {
			res.redirect('/tbs');
		}
	});
});

app.get('/tbs', function(req, res) {

	var moment = require('./cloud/moment-with-locales.min.js');
	moment.locale('fr');
	
	var shortDateFormat = "dddd @ HH:mm"; 
	app.locals.moment = moment; 
	app.locals.shortDateFormat = shortDateFormat;

	var Travelbug = Parse.Object.extend("Travelbug");
	var queryTbs = new Parse.Query(Travelbug);
	queryTbs.descending("updatedAt");
	queryTbs.equalTo("Active", true);
	queryTbs.find({
		success: function(tbs) {
			res.render('tbs', { message: 'Les objets à trouver', tbs:tbs });
		}
	});
});


app.get('/geocache', function(req, res) {

	var moment = require('./cloud/moment-with-locales.min.js');
	moment.locale('fr');
	
	var shortDateFormat = "dddd @ HH:mm"; 
	app.locals.moment = moment; 
	app.locals.shortDateFormat = shortDateFormat;

	var Geocache = Parse.Object.extend("Geocache");
	var query = new Parse.Query(Geocache);
	query.get(req.query.id, {
		success: function(cache) {				 
			var geocacheName = cache.get("Nom");
			var geocachePublicationDate = cache.get("Publication");
			var geocacheDifficulty = cache.get("Difficulty");
			var geocacheTerrain = cache.get("Terrain");
			var geocacheSize = cache.get("Size");
			var geocacheCategory = cache.get("Category");
			var geocachePhotoUrl = cache.get("Photo").url({forceSecure: true}).replace(/^[a-zA-Z]{3,5}\:\/{2}[a-zA-Z0-9_.:-]+\//, '');
			var geocacheDescription = cache.get("Description");
			var geocacheIndice = cache.get("Indice");
			var geocacheSpoiler = cache.get("Spoiler").url({forceSecure: true}).replace(/^[a-zA-Z]{3,5}\:\/{2}[a-zA-Z0-9_.:-]+\//, '');
			var geocacheGPS = cache.get("GPS");
			var geocacheCoordString = cache.get("GPSString");
			var geocacheFav = cache.get("Fav");
			var geocacheId = cache.id;
			var Logs = Parse.Object.extend("Log");
			var queryLog = new Parse.Query(Logs);
			queryLog.equalTo("Geocache", cache);
			queryLog.equalTo("Active", true);
			queryLog.descending("createdAt");
			queryLog.find({
				success: function(logs) {
					var Travelbug = Parse.Object.extend("Travelbug");
					var queryTbs = new Parse.Query(Travelbug);
					queryTbs.descending("createdAt");
					queryTbs.equalTo("Active", true);
					queryTbs.equalTo("cacheId", geocacheId);
					queryTbs.find({
						success: function(travelbugs) {
							
							var TravelbugLog = Parse.Object.extend("TravelbugLog");
							var queryTbsLogged = new Parse.Query(TravelbugLog);
							queryTbsLogged.descending("createdAt");
							queryTbsLogged.equalTo("Action","drop");
							queryTbsLogged.equalTo("Active", true);
							queryTbsLogged.equalTo("Action", "drop");
							queryTbsLogged.equalTo("cacheId", cache.id);
							queryTbsLogged.find({
								
								success: function(objetsLogged) {
							
									res.render('geocache', { nom:geocacheName, id:geocacheId, 
															 fav: geocacheFav, d:geocacheDifficulty, 
															 t:geocacheTerrain, cat:geocacheCategory, 
															 size:geocacheSize, coord:geocacheCoordString, 
															 gps:geocacheGPS, description:geocacheDescription, 
															 indice:geocacheIndice, photo:geocachePhotoUrl, 
															 spoiler:geocacheSpoiler, logs:logs, 
															 publication:geocachePublicationDate,
															 objets:travelbugs, objetsLogged:objetsLogged });
									},
									error: function(object, error) {
										res.redirect('/geocaches');
									}
								});
						},
						error: function(object, error) {
							res.redirect('/geocaches');
						}
					});
				},
				error: function(object, error) {
					res.redirect('/geocaches');
				}	
			});	
		},
		error: function(object, error) {
			res.redirect('/geocaches');
		}	
	});
});

app.get('/flashit', function(req, res) {
	var codeId = req.query.id;
	jds.getGeocacheWithCodeId(codeId).then(function(cache) {
        if(cache) {
            res.render('flashit', { nom: cache.get("Nom"), 
	    							code: cache.get("codeId"), 
									cat: cache.get("Category")});
        } else {
            console.log("Geocache with codeId: " + codeId + " was not found");
            res.render('error', { message:"Code de suivi invalide !"}); 
        }
    }, function(error) {
        console.error("Error in flashit: " + error);
        res.render('error', { message:"Code de suivi invalide ! " + error.message });
    });
});



app.post('/myscore', function(req, res) {
	var email = req.body.email.toLowerCase();

	var promiseGeocacheur = jds.getGeocacheurWithEmail(email);
	var promiseTbOfGeocacheur = jds.getTbOfGeocacheur(email);
	var promiseScore = jds.computeScoreForGeocacheur(email);
	
	Promise.all([promiseScore,promiseGeocacheur,promiseTbOfGeocacheur])
    .then(
        function(values) { 
        	var score = values[0];
        	var geocacheur = values[1];
        	if (geocacheur == undefined) {
                throw "Geocacheur " + email + " non trouvé";
            }
            var tbOwned = values[2];

			
			if (score == undefined) {
				console.log("score null");
				res.render('error', { message:error });
			} else {
				console.log("score not null : " + score);
				res.render('myscore', { email:email, pseudo: geocacheur.get("Pseudo") , scoresCache: score.scoreCaches, scoreTb: score.scoreTb, scoreMyTb: score.scoreMyTb , mytb: {id: tbOwned.id, name: tbOwned.get("Name")}});		
			}	
		})
    .catch(
        function(error) {
            console.error(error);
            res.render('error', { message:error });
        }
    );

});


app.get('/logtb', function(req, res) {
	var Travelbug = Parse.Object.extend("Travelbug");
	var Geocacheur = Parse.Object.extend("Geocacheur");

	var query = new Parse.Query(Travelbug);
	query.equalTo("objectId", req.query.id);
	query.find({
		success: function(results) {
			if(results.length > 0) {
	    		for (var i = 0; i < results.length; i++) { 
	    			var object = results[i];
	    		}
	    		var tbName = object.get("Name");
	    		var tbOwner = object.get("Owner");
	    		var tbHolder = object.get("Holder");
	    		var tbCacheName = object.get("cacheName");
	    		var tbCacheId = object.get("cacheId");
	    		var tbMission = object.get("Mission");
	    		var tbId = object.id;

	    		var Geocaches = Parse.Object.extend("Geocache");
				var query = new Parse.Query(Geocaches);
				if (req.query.cacheId != null) {
					query.equalTo("objectId",req.query.cacheId);
				}
				query.equalTo("Active",true);
				query.notContainedIn("Category", ["VIRTUAL", "EARTHCACHE", "WEBCAM", "SPECIAL"]); // Only physical boxes and EVENTS
				query.ascending("Nom");
				query.find({ 
					success: function(caches) {
						var queryGeocacheurs = new Parse.Query(Geocacheur);
						queryGeocacheurs.equalTo("objectId", req.query.geocacheurId);
						queryGeocacheurs.find({
							success: function(geocacheurs) {
								if(geocacheurs.length == 1) {
						    		var geocacheur = geocacheurs[0];

						    		res.render('foundittb', { nom:tbName,
															  action:req.query.action,
						    								  owner:tbOwner,
						    								  holder:tbHolder,
						    								  email:geocacheur.get("Email"), 
						    								  pseudo:geocacheur.get("Pseudo"),
						    								  cacheName:tbCacheName,
						    								  cacheId:tbCacheId,
						    								  mission:tbMission,
						    								  geocaches:caches,
						    								  id:tbId });
						    	} else {
							    	res.render('found', { cacheid:0, message: "Geocacheur non trouvé" });
						    	}
						    }, 
						    error: function(object, error) {
					  			res.render('found', { cacheid:0, message: "Geocacheur non trouvé" });
					  		}
					  	});
			    	}
			    });
	    	} else {
	    		console.log("Erreur in logtb : results.length is < 0")
	    		res.redirect('/tbs');
	    	}
	    },
	    error: function(object, error) {
	    	console.error(error.message)
	    	res.redirect('/geocaches');
	    }	
	});
});

app.post('/foundtb', upload.single('pic'), function (req, res, next) {
	var TravelbugLog = Parse.Object.extend("TravelbugLog");
	var logEntry = new TravelbugLog();

	var travelBugId = req.body.id;
	var trackingCode = req.body.tracking.toUpperCase();
	var email = req.body.email.toLowerCase();
	var action = req.body.action;
	var name = req.body.name;
	var message = req.body.message;
	var geocacheId = req.body.geocache;
	var fav = req.body.fav;
	var photoFile = req.file;

	jds.getTravelbugWithTrackingCode(trackingCode).then(function(tb) {
        if(tb) {
			console.log("Regardons si " + email + " a trouve la cache ID " + geocacheId + " pour pouvoir balader " + tb.id);
			jds.getGeocache(geocacheId).then(function(cache) {
		        if(cache) {
					jds.hasEmailFoundGeocache(email, cache).then(function(result) {
				        if(result) {
							if (travelBugId == tb.id) {
								console.log("Identifiant de TB valide");
								logEntry.set("Pseudo", name);
								logEntry.set("Email", email);
								logEntry.set("Message", message);
								logEntry.set("Date", new Date());
								logEntry.set("Active", true);
								logEntry.set("Travelbug", tb);
								logEntry.set("TravelbugId", tb.id);
								logEntry.set("TravelbugName", tb.get("Name"));
								logEntry.set("Geocache", cache);
								logEntry.set("cacheId", cache.id);
								logEntry.set("cacheName", cache.get("Nom"));

								if(photoFile) {
									var photoFileBase64 = photoFile.buffer.toString('base64');
									var parseFile = new Parse.File(photoFile.originalname, { base64: photoFileBase64 })
									parseFile.save().then(function () {
										var photo_url = parseFile.url({forceSecure: true})
										logEntry.set("PhotoUrl", photo_url);
										logEntry.set("Photo", parseFile);
										logEntry.set("MissionReviewed", false);
									},
									function (error) {
										console.error("Photofile save error in foundtb: " + error.message);
									});
								}

								
								var promiseFirstTbDropOnGeocache = jds.isFirstTbDropOnGeocache(tb, cache);
    							var promiseFirstTbDropByEmail = jds.isFirstTbDropByEmail(tb, email);
    							var promiseTbByEmail = jds.countTravelBugHoldByEmail(email);
    							

							    Parse.Promise.all([promiseFirstTbDropOnGeocache, promiseFirstTbDropByEmail, promiseTbByEmail])
							    .then(
							        function(values) { 

							            var firstimeTbDropInGeocache = values[0];
							            var firstimeTbDropByEmail = values[1];
							            var nbTbs = values[2];

							            console.log("firstimeTbDropInGeocache = " + firstimeTbDropInGeocache)
										console.log("firstimeTbDropByEmail = " + firstimeTbDropByEmail)
							            console.log("nbTbs = " + nbTbs)


							            if (action == 'grab' && nbTbs > 3) {
											res.render("error", { message: "Il n'est pas possible de détenir plus de 3 objets voyageurs en même temps." });
										} else {

								            if(firstimeTbDropByEmail) {
												logEntry.set("NewTB", 1);
												if(firstimeTbDropInGeocache) {
													logEntry.set("NewCache", 1);
												} else {
													logEntry.set("NewCache", 0);
												}
											} else {
												logEntry.set("NewTB", 0);
												logEntry.set("NewCache", 0);
											}

											if (action == 'grab') {
												logEntry.set("Action", "grab");
												tb.set("cacheId", null);
												tb.set("cacheName", null);
												tb.set("Holder", name);
												tb.set("HolderEmail", email);
											}

											if (action == 'drop') {
												logEntry.set("Action", "drop");
												tb.set("cacheId", cache.id);
												tb.set("cacheName", cache.get("Nom"));
												tb.set("Holder", null);
												tb.set("HolderEmail", null);
											}

											if (fav == "true") {
												logEntry.set("Fav", true);
												tb.increment("Fav");
											} else {
												logEntry.set("Fav", false);
											}


												
											tb.save();
											//cache.save();
											logEntry.save(null, {
												success: function (logEntry) {
													res.render('foundtb', { tbid: travelBugId, 
														message: "Super " + name + " !<br><br>Votre action sur l'objet voyageur "
														+ tb.get("Name") + " est bien enregistrée. <br><br><br>"
														+ "Merci de contribuer à la réussite de sa mission !"
													});
												},
												error: function (error) {
													console.error("Error TB LogEntry : " + error.message);
													res.render('error', { message: error.message });
												}
											});
										}
									}
								)
								.catch(
					                function(error) {
					                    console.error(error);
					                    throw error;
					                }  
				            	);
							}
							else {
								console.error("Identifiant de TB invalide ! : " + travelBugId + ' - ' + tb.id);
								res.render('error', { message: "Mismatch Identifiants de TB invalide - 2 TB avec même code de suivi !" });
							}
				        } else {
				            console.error("Pas de log présent sur cette géocache ! : " + geocacheId + ' - ' + tb.id);
							res.render('error', {message: "La cache n'ayant pas encore été logguée, impossible d'y faire voyager un tb !"});
				        }
				    }, function(error) {
				        console.error("Error searching hasEmailFoundGeocache in LogEntry : " + error.message);
						res.render('error', { message: error.message });
				    });
		        } else {
					res.render('error', { message: "Géocache non trouvée !" });
		        }
		    }, function(error) {
		        console.error("Error Cache retrieve : " + error.message);
				res.render('error', { message: error.message });
		    });
        } else {
            console.error("Unsuccessfull TB retrieve or Inactive TB");
			res.render('error', { message:"Code de suivi invalide ou Objet Voyageur désactivé." });
        }
    }, function(error) {
    	console.error("Error getTravelbugWithTrackingCode : " + error.message);
		res.render('error', { message:error.message });
    });
});

app.post('/flash', function(req, res) {
	
	var codeId = req.body.code.toUpperCase();
	var email = req.body.email.toLowerCase();

	jds.getGeocacheWithCodeId(codeId).then(function(cache) {
        if(cache) {
			jds.getLogWithEmailAndCache(email, cache).then(function(resLogs) {
		        if(resLogs) {
		        	jds.getAllTravelbugsInCache(cache).then(function(travelbugsInCache) {
				        if(travelbugsInCache) {
				            jds.getAllTravelbugsInHands(email).then(function(travelbugsInHands) {
						        if(travelbugsInHands) {
						        	jds.getGeocacheurWithEmail(email).then(function(geocacheur) {
								        if(geocacheur) {
								            res.render('found', { cacheid: cache.id,
								            					  cat: cache.get("Category"), 
								            					  geocacheurId: geocacheur.id, 
								            					  tbsout: travelbugsInCache, 
								            					  tbsin: travelbugsInHands, 
								            					  message: "La cache a déja été trouvée mais vous pouvez quand même faire voyager des objets.<br><br>" });
								        } else {
								        	res.render('error', { message: "Geocacheur non trouvé avec l'email : " + email 
				        							+ "<br><br>Il peut-être nécessaire d'<a href=\"/register\"><u>enregistrer votre objet voyageur</u></a> au préalable." });
								        }
								    }, function(error) {
								    	res.render('error', { message: error.message });
								    });
						        } else {
						            res.render('error', { message: "Pas d'objet voyageur dans les mains de ce géocacheur : " + email });
						        }
						    }, function(error) {
						        res.render('error', { message: error.message });
						    });

				        } else {
				            res.render('error', { message: "Pas d'objet voyageur dans cette cache" });
				        }
				    }, function(error) {
				    	res.render('error', { message: error.message });
				    });

		        } else {
		            console.log("Log with email: " + email + " was not found - Looking for a Geocacheur to prepare a new Log");
					jds.getGeocacheurWithEmail(email).then(function(geocacheur) {
				        if(geocacheur) {
				            res.render('foundit', { nom: cache.get("Nom"), 
					    							id: cache.id, 
					    							email: geocacheur.get("Email"), 
					    							pseudo: geocacheur.get("Pseudo"),
													cat: cache.get("Category") });
				        } else {
				        	res.render('error', { message: "Geocacheur non trouvé avec l'email : " + email 
				        		+ "<br><br>Il peut-être nécessaire d'<a href=\"/register\"><u>enregistrer votre objet voyageur</u></a> au préalable." });
				        }
				    }, function(error) {
				    	res.render('error', { message: error.message });
				    });
		        }
		    }, 
		    function(error) {
		    	res.render('error', { message: error.message });
		    });
        } else {
            console.log("Geocache with codeId: " + codeId + " was not found");
            res.render('error', { message:"Code de suivi introuvable !"}); 
        }
    }, function(error) {
        res.render('error', { message: error.message });
    });

});

app.post('/found', upload.single('pic'), function (req, res, next) {

	var name = req.body.name;
	var email = req.body.email.toLowerCase();
	var message = req.body.message;
	var fav = req.body.fav;
	var cacheId = req.body.id;
	var photoFile = req.file;

	jds.getGeocacheurWithEmail(email).then(function(geocacheur) {

        if(geocacheur) {
			jds.getGeocache(cacheId).then(function(cache) {
				if(cache) {
					jds.getAllActiveLogWithCache(cache).then(function(logs) {

						jds.getAllTravelbugsInCache(cache).then(function(travelbugsInCache) {

					        jds.getAllTravelbugsInHands(email).then(function(travelbugsInHands) {

					        	jds.hasEmailFoundGeocache(email, cache).then(function(isGeocacheAlreadyFound) {

					        		if (isGeocacheAlreadyFound) {
										res.render('found', { 
											cacheid: cache.id, 
											cat: cache.get("Category"),
											geocacheurId:geocacheur.id, 
											tbsout: travelbugsInCache, 
											tbsin: travelbugsInHands, 
											message:"La cache a déja été trouvée mais vous pouvez quand même faire voyager des objets.<br><br>"});
					        		}
					        		else {
					        			var Log = Parse.Object.extend("Log");
									    var logEntry = new Log();
										logEntry.set("Pseudo", name);
										logEntry.set("Email", email);
										logEntry.set("Message", message);
										logEntry.set("Date", new Date());
							        	logEntry.set("Geocache", cache);
										logEntry.set("Active", true);

										if(photoFile) {
											var filename = photoFile.originalname;
											var photoFileBase64 = photoFile.buffer.toString('base64');
											var parseFile = new Parse.File(filename, { base64: photoFileBase64 });
											parseFile.save().then(function () {
												var photo_url = parseFile.url({forceSecure: true})
												console.log("Photo saved : " + photo_url);
												logEntry.set("PhotoUrl", photo_url);
												logEntry.set("Photo", parseFile);
											},
											function (error) {
												console.log("Photofile save error " + error.message);
											});
										}

							        	// Becarefull with this, not always the case in the field
							        	var ftfScore = 0;
							        	var stfScore = 0;
							        	var ttfScore = 0;
										if(logs.length == 0) {
											ftfScore = 1;
										} else if(logs.length == 1) {
											stfScore = 1;
										} else if(logs.length == 2) {
											ttfScore = 1;
										}	
										logEntry.set("FTF", ftfScore);
										logEntry.set("STF", stfScore);
										logEntry.set("TTF", ttfScore);
										
										if(fav == "true") {
											logEntry.set("Fav", true);
											cache.increment("Fav");
											cache.save();
										} else {
											logEntry.set("Fav", false);
										}

										logEntry.save(null, {
											success: function(object) {
												res.render('found', { cacheid: cache.id, 
																	  cat: cache.get("Category"),
																	  geocacheurId: geocacheur.id, 
																	  tbsout: travelbugsInCache, 
																	  tbsin: travelbugsInHands, 
																	  message:"Bravo " + name 
															  		  + " !<br><br>N'oubliez pas de signer aussi le logbook ;-)<br>"
																	  + "Et attention aux moldus !" });
											},
											error: function(object, error) {
												console.error("Error in logEntry.save(): " + error);
											  	res.render('error', { message: error.message });
											}
										});	
						        	}
							    }, function(error) {
							    	console.error("Error in hasEmailFoundGeocache: " + error);
							        res.render('error', { message: error.message });
							    });
						    }, function(error) {
						    	console.error("Error in getAllTravelbugsInHands: " + error);
						        res.render('error', { message: error.message });
						    });
					    }, function(error) {
					    	console.error("Error in getAllTravelbugsInCache: " + error);
					        res.render('error', { message: error.message });
					    });								
				    }, function(error) {
				    	console.error("Error in getAllActiveLogWithCache: " + error);
				    	res.render('error', { message: error.message });
				    });
				}
				else {
					console.log("Geocacheur with id: " + cacheid + " was not found");
            		res.render('error', { message:"Géocache non trouvée !" }); 
				}
			}, function(error) {
        		console.error("Error in getGeocache: " + error);
        		res.render('error', { message: error.message });
    		});
        } else {
            console.log("Geocacheur with email: " + email + " was not found");
            res.render('error', { message:"Il n'y a pas de géocacheur activé avec l'email : " + email + "<br><br><a href=\"/register\"><u>Rendez-vous ici pour enregistrer un objet voyageur</u></a>"}); 
        }
    }, function(error) {
        console.error("Error in getGeocacheurWithEmail: " + error);
        res.render('error', { message:error.message });
    });
});

var port = process.env.PORT || 1337;
var httpServer = require('http').createServer(app);
httpServer.listen(port, function() {
	console.log('Geocaching-JDS running on port ' + port + '.');
});

// This will enable the Live Query real-time server
ParseServer.createLiveQueryServer(httpServer);
