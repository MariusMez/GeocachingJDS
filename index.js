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

app.get('/register', function(req, res) {
	res.render('register');
});

app.post('/registerTb', upload.single('pic'), function (req, res, next) {

	var Travelbug = Parse.Object.extend("Travelbug");
	var travelbug = new Travelbug();

	var TravelbugLog = Parse.Object.extend("TravelbugLog");
	var logEntry = new TravelbugLog(); 

	var parseFile;

	if(req.file) {
		var photoFile = req.file;
		var name = photoFile.originalname;

		sharp(photoFile.buffer).resize(1024, 1024)
							   .max()
							   .withoutEnlargement()
							   .toBuffer()
							   .then(function(buffer_img) { 

			var photoFileBase64 = buffer_img.toString('base64');
			parseFile = new Parse.File(name, { base64: photoFileBase64 })
			parseFile.save().then(function() {

					var photo_url = parseFile.url({forceSecure: true})
					console.log("Photo saved in registerTb: " + photo_url);

					if(parseFile) {
						travelbug.set("PhotoUrl", photo_url);
						travelbug.set("Photo", parseFile);
					}
					travelbug.set("Name", req.body.name);
					travelbug.set("Code", req.body.code);
					travelbug.set("Description", req.body.description);
					travelbug.set("Owner", req.body.pseudo);
					travelbug.set("Email", req.body.email);
					travelbug.set("Mission", req.body.mission);
					travelbug.set("CreatedAt", new Date());
					travelbug.set("cacheId", null); //id de la cache qui le contient . null si holder n'est pas null et reciproquement. 
					travelbug.set("cacheName", null);
					travelbug.set("Holder", req.body.pseudo);
					travelbug.set("Fav", 0);
					travelbug.set("Active", true);

					travelbug.save(null, {
						success: function() {
							console.log("Successfull TB created");
				  			logEntry.set("PhotoUrl", photo_url);
							logEntry.set("Photo", parseFile);
							logEntry.set("Travelbug", travelbug);
							logEntry.set("Pseudo", req.body.pseudo);
							logEntry.set("Email", req.body.email);
							logEntry.set("Message", req.body.message);
							logEntry.set("Date", new Date());
							logEntry.set("Action", "Created");
							logEntry.set("Active", true);
							logEntry.set("TravelbugId", travelbug.id);
							logEntry.set("TravelbugName", travelbug.get("Name"));
							logEntry.save(null, {
								success: function() {
									res.render('tbregistered', { tbid:travelbug.id, message:"Bravo " 
													 + req.body.pseudo + " !<br><br>Votre objet voyageur " 
													 + req.body.name + " est bien enregistré. <br><br><br>"
													 + "Il est temps d'aller le poser dans une boite et de vous amuser"
													 + " à déplacer les objets voyageurs des autres !" });
									 console.log("Successfull TB log created");
													 
								},
								error: function(error) {
									console.log("Error TBlogEntry : " + error.message);
									res.render('tbregistered', { travelbug:0, message: error.message });
								}
							});	
							
						},
						error: function(error) {
							res.render('tbregistered', { travelbug:0, message: error.message });
						}
					});		
				},
				function(error) {
					console.log("Photofile save error " + error.message);
				}
			);
		});
	}
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
				res.render('ranking', { geocacheurs: rank, geocacheursFTF: rankFTF, geocaches: caches });
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
					res.render('geocaches', { message: 'Les caches à trouver', geocaches:caches, logs:logs });
				}
			});
		}
	});
});

app.get('/photos', function(req, res) {
	var moment = require('./cloud/moment-with-locales.min.js');
	moment.locale('fr');
	app.locals.moment = moment;
	var Log = Parse.Object.extend("Log");
	var queryLog = new Parse.Query(Log);
	queryLog.descending("createdAt");
	queryLog.equalTo("Active", true);
	queryLog.exists("PhotoUrl");
	queryLog.limit(1000);
	queryLog.include("Geocache");
	queryLog.find({
		success: function(logs) {
			var Geocaches = Parse.Object.extend("Geocache");
			var query = new Parse.Query(Geocaches);
			query.equalTo("Active",true);
			query.descending("RatioFav");
			query.find({ 
				success: function(caches) {
					res.render('photos', { message: 'Les caches à trouver', geocaches:caches, logs:logs });
				}
			});
		}
	});
});

app.get('/geocaching', function(req, res) {
	res.render('geocaching', { message: 'Régles du jeu Geocaching' });
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
					res.render('geocaches', { message:"Redirection toutes les caches" });
				}
			});
		},
		error: function(object, error) {
			var queryTbs = new Parse.Query(Travelbug);
			queryTbs.descending("createdAt");
			queryTbs.equalTo("Active", true);
			queryTbs.find({
				success: function(tbs) {
					res.render('tbs', { message: 'Les objets à trouver', tbs:tbs });
				}
			});
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

	//var moment = require('moment');
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
							queryTbsLogged.equalTo("Geocache", cache);
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
										res.render('geocaches', { message:"Redirection toutes les caches" });
									}
								});
														 
								
						},
						error: function(object, error) {
							res.render('geocaches', { message:"Redirection toutes les caches" });
						}
					});
				},
				error: function(object, error) {
					res.render('geocaches', { message:"Redirection toutes les caches" });
				}	
			});	
		},
		error: function(object, error) {
			res.render('geocaches', { message:"Redirection toutes les caches" });
		}	
	});
});


app.get('/foundit', function(req, res) {
	var Geocache = Parse.Object.extend("Geocache");
	var query = new Parse.Query(Geocache);
	query.equalTo("codeId", req.query.id);
	query.find({
		success: function(results) {
			if(results.length > 0) {
	    		for (var i = 0; i < results.length; i++) { 
	    			var object = results[i];
	    		}
	    		var geocacheName = object.get("Nom");
	    		var geocacheCat = object.get("Category");
	    		var geocacheId = object.id;
				
				var Travelbug = Parse.Object.extend("Travelbug");
				var queryTbs = new Parse.Query(Travelbug);
				queryTbs.descending("createdAt");
				queryTbs.equalTo("Active", true);
				queryTbs.equalTo("cacheId", geocacheId);
				queryTbs.find({
					success: function(travelbugs) {
		    		res.render('foundit', { nom:geocacheName, 
		    								id:geocacheId, 
				    						cat:geocacheCat, 
				    						tbs:travelbugs });
					
						},
						error: function(object, error) {
							res.render('geocaches', { message:"Redirection toutes les caches" });
						}
					});
	    	} else {
	    		res.render('foundit', { nom:"Code invalide !", id:0, cat:"UNKNOWN" });
	    	}
	    },
	    error: function(object, error) {
	    	res.render('foundit', { nom:"Code invalide !", id:0, cat:"UNKNOWN" });
	    }	
	});
});


// TODO : gérer le cas ou le TB est présent dans une cache
// Ajouter l'option Récupérer dans la cache : nom de la cache
// Gérer les cas d'erreur Grab depuis une autre cache que celui dans lequel il est affecté dans la BDD
app.get('/logtb', function(req, res) {
	var Travelbug = Parse.Object.extend("Travelbug");
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
				query.descending("RatioFav");
				query.find({ 
					success: function(caches) {
			    		res.render('foundittb', { nom:tbName,
												  action:req.query.action,
			    								  owner:tbOwner,
			    								  holder:tbHolder,
			    								  cacheName:tbCacheName,
			    								  cacheId:tbCacheId,
			    								  mission:tbMission,
			    								  geocaches:caches,
			    								  id:tbId });
			    	}
			    });
	    	} else {
	    		console.log("Erreur in logtb : results.length is < 0")
	    		var queryTbs = new Parse.Query(Travelbug);
				queryTbs.descending("createdAt");
				queryTbs.equalTo("Active", true);
				queryTbs.find({
					success: function(tbs) {
						res.render('tbs', { message: 'Les objets à trouver', tbs:tbs });
					}
				});
	    	}
	    },
	    error: function(object, error) {
	    	console.log("General error in logtb")
	    	res.render('geocaches', { message:"Redirection toutes les caches" });
	    }	
	});
});

app.post('/foundtb', upload.single('pic'), function (req, res, next) {
	var TravelbugLog = Parse.Object.extend("TravelbugLog");
	var Geocache = Parse.Object.extend("Geocache");
	var logEntry = new TravelbugLog();
	var parseFile;

	var Travelbug = Parse.Object.extend("Travelbug");
	var query = new Parse.Query(Travelbug);
	query.equalTo("Code", req.body.tracking);
	query.find({
		success: function(results) {
			
			if(results.length > 0) {
				console.log("Successfull TB retrieve");

	    		for (var i = 0; i < results.length; i++) { 
	    			var tb = results[i];
	    		}

	    		// Need to initialize a promise object because sharp class return a promise
	    		// This handle the case when no picture are submitted (no required args here)
	    		var promise = new Promise(function(resolve, reject) {
  					resolve(1);
				});

	    		if(req.file) {
	    			promise = sharp(req.file.buffer).resize(1024, 1024)
												    .max()
												    .withoutEnlargement()
												    .toBuffer()
				}

				// Use promise object instanciated previously by me or redefined by sharp if pic file is submitted
				promise.then(function(buffer_img) { 
					if(req.file) {
						var photoFileBase64 = buffer_img.toString('base64');
						parseFile = new Parse.File(req.file.originalname, { base64: photoFileBase64 })
						parseFile.save().then(function () {
								var photo_url = parseFile.url({forceSecure: true})
								console.log("Photo TB saved in foundtb : " + photo_url);
								logEntry.set("PhotoUrl", photo_url); // Doesn't seems to work
								logEntry.set("Photo", parseFile); // Doesn't seems to work
							},
							function (error) {
								console.log("Photofile save error in foundtb" + error.message);
							}
						);
					}

					// Hack WTF, don't know why it doesn't save without this part...
					if(parseFile) {
						logEntry.set("PhotoUrl", parseFile.url({forceSecure: true})); // Seems to work
						logEntry.set("Photo", parseFile); // Seems to work
					}

					logEntry.set("Pseudo", req.body.name);
					logEntry.set("Email", req.body.email);
					logEntry.set("Message", req.body.message);
					logEntry.set("Date", new Date());
					
					var Geocache = Parse.Object.extend('Geocache');
				    var queryCache = new Parse.Query(Geocache);
				    queryCache.get(req.body.geocache, {
				        success: function(cache) {
							logEntry.set("Geocache", cache);

							if (req.body.id == tb.id) {
								console.log("Identifiant de TB valide");
								logEntry.set("Travelbug", tb);
								// denormalise to avoid querying each time Travelbug
								logEntry.set("TravelbugId", tb.id);
								logEntry.set("TravelbugName", tb.get("Name"));
								logEntry.set("cacheId", cache.id);
								logEntry.set("cacheName", cache.get("Nom"));
							}
							else {
								console.log("Identifiant de TB invalide !");
								res.render('foundtb', { nom:"Mismatch Identifiants de TB invalide !", tbid:req.body.id });		    	
							}

							if (req.body.action == 'grab') {
								logEntry.set("Action", "grab");
								tb.set("cacheId", null);
								tb.set("cacheName", null);
								tb.set("Holder", req.body.name);
							}
							if (req.body.action == 'drop') {
								logEntry.set("Action", "drop");
								tb.set("cacheId", cache.id);
								tb.set("cacheName", cache.get("Nom"));
								tb.set("Holder", null);
							}

							logEntry.set("Active", true);

							if(req.body.fav == "true") {
								logEntry.set("Fav", true);
								tb.increment("Fav");
							} else {
								logEntry.set("Fav", false);
							}

							tb.save();
							cache.save();

							logEntry.save(null, {
								success: function(logEntry) {
									res.render('foundtb', { tbid:req.body.id, message:"Super " 
														    + req.body.name + " !<br><br>Votre action sur l'objet voyageur " 
															+ tb.get("Name") + " est bien enregistrée. <br><br><br>"
															+ "Merci de contribuer à la réussite de sa mission !" });
								},
								error: function(logEntry, error) {
									console.log("Error TBlogEntry : " + error.message);
									res.render('foundtb', { tbid:req.body.id, message: error.message });
								}
							});	
						},
						error: function(logEntry, error) {
							console.log("Error found Cache in TBlogEntry : " + error.message);
							res.render('foundtb', { tbid:req.body.id, message: error.message });
						}
					});
				});
	    	}
	    	else {
				console.log("Unsuccessfull TB retrieve");
				res.render('foundtb', { message:"Code de suivi invalide !", tbid:req.body.id });
	    	}
	    },
	    error: function(object, error) {
	    	console.log("Error TB retrieve : " + error.message);
	    	res.render('foundtb', { message:"Code de suivi invalide !", tbid:req.body.id });
	    }
	});
});


app.post('/found', upload.single('pic'), function (req, res, next) {

/**
	var userResponse = req.query['g-recaptcha-response'];
	console.log(userResponse);
	if(userResponse) {
		recaptcha.checkResponse(userResponse, function(error, response){
			if(error) {
            	// an internal error? 
            	res.status(400).render('400', {
            		message: error.toString()
            	});
            	return;
        	}
       		if(response.success) {
        		console.log("Recaptcha valid, human detected");
            	// save session.. create user.. save form data.. render page, return json.. etc. 
        	} else {
        		res.render('found', { cacheid:0, message: 'Bot detected...' });
        		return;
        	}
    	});
	}
**/

	var Log = Parse.Object.extend("Log");
	var Geocache = Parse.Object.extend("Geocache");
	var logEntry = new Log();
	var parseFile;

	if(req.file) {
		var photoFile = req.file;
		var name = photoFile.originalname;
		var photoFileBase64 = photoFile.buffer.toString('base64');
		parseFile = new Parse.File(name,{ base64: photoFileBase64 })
		parseFile.save().then(function () {
			var photo_url = parseFile.url({forceSecure: true})
			console.log("Photo saved : " + photo_url);
			logEntry.set("PhotoUrl", photo_url);
			logEntry.set("Photo", parseFile);
		},
		function (error) {
			console.log("Photofile save error " + error.message);
				//res.render('found', { cacheid: 0, message: error.message })
			}
		);
	}

	if(parseFile) {
		logEntry.set("PhotoUrl", parseFile.url());
		logEntry.set("Photo", parseFile);
	}
	logEntry.set("Pseudo", req.body.name);
	logEntry.set("Email", req.body.email);
	logEntry.set("Message", req.body.message);
	logEntry.set("Date", new Date());
	var cache = new Geocache();
	cache.id = req.body.id;

	logEntry.set("Geocache", cache);
	logEntry.set("Active", true);

	if(req.body.fav == "true") {
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
			queryTbs.equalTo("cacheId", req.body.id);
			queryTbs.find({
				success: function(travelbugsInCache) {
					
					var queryTbsHands = new Parse.Query(Travelbug);
					queryTbsHands.descending("createdAt");
					queryTbsHands.equalTo("Active", true);
					queryTbsHands.equalTo("Holder", req.body.name);
					queryTbsHands.find({
						success: function(travelbugsInHands) {
			
						res.render('found', { cacheid:cache.id, tbsout: travelbugsInCache, tbsin: travelbugsInHands, cacheid:req.body.id, message:"Bravo " + req.body.name 
								  + " !<br><br>N'oubliez pas de signer aussi le logbook ;-) <br><br>"
								  + "<i>(lorsqu'il y a une boite physique à trouver)</i><br><br>"
								  + "Et attention aux moldus !" });
		  					},
		  					error: function(object, error) {
		  						res.render('found', { cacheid:0, message: error.message });
		  					}
		  				});
		
					},
					error: function(object, error) {
						res.render('found', { cacheid:0, message: error.message });
					}
				});

		},
		error: function(logEntry, error) {
			res.render('found', { cacheid:0, message: error.message });
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
