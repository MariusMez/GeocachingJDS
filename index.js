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
													res.render('error', {message:error.message});
										        }
										    }, function(error) {
										        console.error(error.message);
												res.render('error', {message:error.message});
										    });				
								        },
						                error: function(error) {
						                	console.error("Error TBlogEntry : " + error.message);
											res.render('error', {message:error.message});
						                }																									 
									});
								},
								error: function(error) {
									console.error("Error TBlogEntry : " + error.message);
									res.render('error', {message:error.message});
								}
							});	
						}, function(error) {
							console.error("Error saving photofile " + error.message);
							res.render('error', {message:error.message});
						});
					}
					else {
						var error = "Une photo de l'objet voyageur est requise.";
						console.error(error);
						res.render('error', {message:error});
					}
				}
		    }, function(error) {
		    	console.error(error.message);
				res.render('error', {message:error.message});
		    });
        } else {
   	  		var error = "Le code de suivi est incorrect ou déjà affecté à un autre objet voyageur.";
			console.error(error);
			res.render('error', {message:error});
        }
    }, function(error) {
        console.error(error.message);
		res.render('error', {message:error.message});
    });
});


app.get('/ranking', function(req, res) {
	var Ranking = Parse.Object.extend("Ranking");
	var queryGeocacheurs = new Parse.Query(Ranking);
	var Geocache = Parse.Object.extend("Geocache");
	var queryGeocaches = new Parse.Query(Geocache);
	queryGeocacheurs.descending("Score, ScoreFTF, ScoreDT");
	queryGeocacheurs.equalTo("Active", true);
	queryGeocacheurs.limit(1000);
	queryGeocacheurs.find().then(function(rank) {
		queryGeocaches.equalTo("Active", true);
		queryGeocaches.descending("RatioFav,Ratio");
		queryGeocaches.find().then(function(caches) {
			queryGeocacheurs.descending("ScoreFTF");
			queryGeocacheurs.equalTo("Active", true);
			queryGeocacheurs.limit(1000);
			queryGeocacheurs.find().then(function(rankFTF) {
				res.render('ranking', {geocacheurs:rank, geocacheursFTF:rankFTF, geocaches:caches});
			});
		});
	});
});


app.get('/geocaches', function(req, res) {
	var moment = require('./cloud/moment-with-locales.min.js');
	moment.locale('fr');
	app.locals.moment = moment;
	var Log = Parse.Object.extend("Log");
	var queryLog = new Parse.Query(Log);
	queryLog.descending("createdAt");
	queryLog.equalTo("Active", true);
	queryLog.limit(5); 
	queryLog.include("Geocache");
	queryLog.find({
		success: function(logs) {
			var Geocaches = Parse.Object.extend("Geocache");
			var query = new Parse.Query(Geocaches);
			query.equalTo("Active",true);
			query.descending("RatioFav");
			query.find({ 
				success: function(caches) {
					res.render('geocaches', {message:'Les caches à trouver', geocaches:caches, logs:logs});
				}
			});
		}
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
	var page = req.query.page;
	if (page === undefined) {
		page = 1;
	}
	var max = 10;

	var TravelbugLog = Parse.Object.extend("TravelbugLog");
	var queryLog = new Parse.Query(TravelbugLog);
	queryLog.descending("createdAt");
	queryLog.equalTo("Active", true);
	queryLog.exists("PhotoUrl");
	queryLog.count({
		success: function(count) {
	    	var queryLog = new Parse.Query(TravelbugLog);
			queryLog.descending("createdAt");
			queryLog.equalTo("Active", true);
			queryLog.equalTo("MissionReviewed", false);
			queryLog.exists("PhotoUrl");
			queryLog.include("Travelbug");
			queryLog.limit(max);
			queryLog.skip(max * page)
			queryLog.find({
				success: function(logs) {
					res.render('validatemission', { logs: logs, 
										      		page: page,
										      		pages: count/max });
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
	var Travelbug = Parse.Object.extend("Travelbug");
	var queryTbs = new Parse.Query(Travelbug);
	queryTbs.descending("createdAt");
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
        console.log("Error in flashit: " + error);
        res.render('error', { message:"Code de suivi invalide ! " + error.message });
    });
});

app.post('/myscore', function(req, res) {
	var email = req.body.email;
	var Logs = Parse.Object.extend("Log");

	const nbPointsFoundIt = 20;
	const nbPointsFTF = 3;
	const nbPointsSTF = 2;
	const nbPointsTTF = 1;
	const nbPointsFavTB = 2;
	const nbPointsMission = 5;
	const nbPointsNewTBDiscover = 10;
	const nbPointsFirstCacheVisit = 10;
	const nbPointsTBOwnerByMove = 2;
	
	var queryCaches = new Parse.Query(Logs);
	queryCaches.equalTo("Email", email);
	queryCaches.equalTo("Active", true);
	queryCaches.include('Geocache');
	queryCaches.find().then( function(mylogs) {
		var scoreCaches = { logs:0, dt:0, ftf:0};
	
		console.log(email+ " logged " + mylogs.length + " caches ");	
		var promise = Parse.Promise.as();
		
  		mylogs.forEach(function(log) {
			console.log(email+ " logged cache with Difficulty " + log.get("Geocache").get("Difficulty"));	
  			promise = promise.then(function() {
  				scoreCaches.dt = scoreCaches.dt + log.get("Geocache").get("Difficulty") + log.get("Geocache").get("Terrain");
  				scoreCaches.logs = scoreCaches.logs + nbPointsFoundIt;
  				scoreCaches.ftf = scoreCaches.ftf + nbPointsFTF*log.get("FTF") + nbPointsSTF*log.get("STF") + nbPointsTTF*log.get("TTF"); 
  				return scoreCaches;
  			});	
  		});		
		return promise;
	}).then(function(scoreCaches) {
		console.log(email+ " has score of " + scoreCaches);	

		var TravelbugLog = Parse.Object.extend("TravelbugLog");
		var queryTbs = new Parse.Query(TravelbugLog);
		queryTbs.equalTo("Active", true);
		queryTbs.equalTo("Action", "drop");
		queryTbs.include("Travelbug");
		queryTbs.find().then ( function(mylogs) {
			var scoreTb = { drop:0, dropTB:0, dropgc:0, missions:0, fav:0, owner:0};
		
			console.log(email + " logged " + mylogs.length + " TB ");	
			var promise = Parse.Promise.as();
			
	  		mylogs.forEach(function(log) {
				promise = promise.then(function() {
					console.log(email+ " logged TB with owner " + log.get("Travelbug").get("OwnerEmail"));	

					if (log.get("Email") == email) {
						scoreTb.dropTB = scoreTb.dropTB + nbPointsFirstCacheVisit*log.get("NewCache");
						scoreTb.dropgc = scoreTb.dropgc + nbPointsNewTBDiscover*log.get("NewTB");
						if (log.get("Mission") != undefined) {
			  				scoreTb.missions = scoreTb.missions + nbPointsMission * log.get("Mission");													
						}
					}  			
	  				if (log.get("Travelbug").get("OwnerEmail") == email) {
		  				scoreTb.fav = scoreTb.fav + log.get("Fav") * nbPointsFavTB; 	  	
		  				scoreTb.owner = scoreTb.owner * nbPointsTBOwnerByMove;				
	  				}
	  				return scoreTb;
	  			});	
	  		});		
			return promise;
		}).then(function(scoreTb) {
			console.log(email+ " has score of " + scoreTb);	

			if (scoreCaches == undefined) {
				scoreCaches = { logs:0, dt:0, ftf:0};
			}

			if (scoreTb == undefined) {
				scoreTb = { dropTB:0, dropgc:0, missions:0, fav:0, owner:0};
			}

			var scoreTotal = scoreCaches.logs + scoreCaches.dt + scoreCaches.ftf + scoreTb.dropTB + scoreTb.dropgc + scoreTb.missions + scoreTb.fav + scoreTb.owner;

			res.render('myscore', { email:email, scoresCache: scoreCaches, scoreTb: scoreTb, scoreTotal:scoreTotal});
		})
	})
	
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

								jds.isFirstTbDropOnGeocache(tb, cache).then(function(firstimeTbDropInGeocache) {
									if(firstimeTbDropInGeocache) {
										logEntry.set("NewCache", 1);
									} else {
										logEntry.set("NewCache", 0);
									}

									jds.isFirstTbDropByEmail(tb, email).then(function(firstimeTbDropByEmail) {
										if(firstimeTbDropByEmail) {
											logEntry.set("NewTB", 1);
										} else {
											logEntry.set("NewTB", 0);
										}

										jds.countTravelBugHoldByEmail(email).then(function(nbTbs) {
											if (nbTbs > 3) {
												res.render("error", { message: "Il n'est pas possible de détenir plus de 3 objets voyageurs en même temps." });
											} else {
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
									    }, function(error) {
									        console.error("Error countTravelBugHoldByEmail : " + error.message);
											res.render('error', { message: error.message });
									    });
								    }, function(error) {
								        console.error("Error isFirstTbDropByEmail : " + error.message);
										res.render('error', { message: error.message });
								    });
							    }, function(error) {
							        console.error("Error isFirstTbDropOnGeocache : " + error.message);
									res.render('error', { message: error.message });
							    });
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
	
	var codeId = req.body.code;
	var email = req.body.email

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

	var Log = Parse.Object.extend("Log");
	var Geocache = Parse.Object.extend("Geocache");
	var Geocacheur = Parse.Object.extend("Geocacheur");
	var logEntry = new Log();

	var name = req.body.name;
	var email = req.body.email.toLowerCase();
	var message = req.body.message;
	var fav = req.body.fav;
	var cacheId = req.body.id;
	var photoFile = req.file;

	var parseFile;
	if(photoFile) {
		var filename = photoFile.originalname;
		var photoFileBase64 = photoFile.buffer.toString('base64');
		parseFile = new Parse.File(filename, { base64: photoFileBase64 });
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

	if(parseFile) {
		logEntry.set("PhotoUrl", parseFile.url({forceSecure: true}));
		logEntry.set("Photo", parseFile);
	}
	logEntry.set("Pseudo", name);
	logEntry.set("Email", email);
	logEntry.set("Message", message);
	logEntry.set("Date", new Date());

	console.log("j'essaye de trouver le geocacheur")
	var queryGeocacheur = new Parse.Query(Geocacheur);
	queryGeocacheur.equalTo("Email", email);
	queryGeocacheur.find({
		success: function(geocacheurs) {
			if(geocacheurs.length == 1) {
	    		var geocacheur = geocacheurs[0];

	    		console.log("le geocacheur : " + geocacheur.get("Email") );

				var cache = new Geocache();
				cache.id = cacheId;

				logEntry.set("Geocache", cache);
				logEntry.set("Active", true);

				logEntry.set("FTF", 0);
				logEntry.set("STF", 0);
				logEntry.set("TTF", 0);

				var queryFTF = new Parse.Query(Log);
				queryFTF.descending("createdAt");
				queryFTF.equalTo("Active", true);
				queryFTF.equalTo("Geocache", cache);
				queryFTF.find({
					success: function(logs) {
						if(logs.length == 0) {
							logEntry.set("FTF", 1);
						} else if(logs.length == 1) {
							logEntry.set("STF", 1);
						} else if(logs.length == 2) {
							logEntry.set("TTF", 1);
						}	

						if(fav == "true") {
							logEntry.set("Fav", true);
							cache.increment("Fav");
							cache.save();
						} else {
							logEntry.set("Fav", false);
						}

						logEntry.save(null, {
							success: function(logEntry) {
								var Travelbug = Parse.Object.extend("Travelbug");
								var queryTbs = new Parse.Query(Travelbug);
								queryTbs.descending("createdAt");
								queryTbs.equalTo("Active", true);
								queryTbs.equalTo("cacheId", cacheId);
								queryTbs.find({
									success: function(travelbugsInCache) {
										
										var queryTbsHands = new Parse.Query(Travelbug);
										queryTbsHands.descending("createdAt");
										queryTbsHands.equalTo("Active", true);
										queryTbsHands.equalTo("HolderEmail", email);
										queryTbsHands.find({
											success: function(travelbugsInHands) {
								
											res.render('found', { 
												cacheid: cache.id, 
												cat: cache.get("Category"),
												geocacheurId: geocacheur.id, 
												tbsout: travelbugsInCache, 
												tbsin: travelbugsInHands, 
												message:"Bravo " + name 
													  + " !<br><br>N'oubliez pas de signer aussi le logbook ;-) <br><br>"
													  + "<i>(lorsqu'il y a une boite physique à trouver)</i><br><br>"
													  + "Et attention aux moldus !" });
							  					},
							  					error: function(object, error) {
							  						res.render('error', { message: error.message });
							  					}
							  				});							
										},
										error: function(object, error) {
											res.render('error', { message: error.message });
										}
									});
							},
							error: function(logEntry, error) {
								res.render('error', { message: error.message });
							}
						});									
					},
					error: function(object, error) {
						logEntry.set("FTF", 0);
						logEntry.set("STF", 0);
						logEntry.set("TTF", 0);
					}
				});  

				res.render('found', { 
					cacheid: cache.id, 
					cat: cache.get("Category"),
					geocacheurId:geocacheur.id, 
					tbsout: travelbugsInCache, 
					tbsin: travelbugsInHands, 
					message:"La cache a déja été trouvée mais vous pouvez quand meme faire voyager des objets.<br><br>"});
			} 
			else {
	    		res.render('error', { message: "Geocacheur non trouvé" });
	    	}
	    }, 
	    error: function(error) {
  			res.render('error', { message: error.message });
  		}
  	});

});

var port = process.env.PORT || 1337;
var httpServer = require('http').createServer(app);
httpServer.listen(port, function() {
	console.log('Geocaching-JDS running on port ' + port + '.');
});

// This will enable the Live Query real-time server
ParseServer.createLiveQueryServer(httpServer);
