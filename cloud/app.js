
				// These two lines are required to initialize Express in Cloud Code.
				express = require('express');
				app = express();

				// Global app configuration section
				app.set('views', 'cloud/views');  // Specify the folder to find templates
				app.set('view engine', 'ejs');    // Set the template engine
				app.use(express.bodyParser());    // Middleware for reading request body

				// This is an example of hooking up a request handler with a specific request
				// path and HTTP verb using the Express routing API.
				app.get('/', function(req, res) {
					res.render('index', { message: 'Page principale' });
				});

				app.get('/tools', function(req, res) {
					res.render('tools', { message: 'Outils application mobile' });
				});

				function compute(email) {
					var Logs = Parse.Object.extend("Log");
					var query = new Parse.Query(Logs);
					query.equalTo("Email", "bourel.julien@wanadoo.fr");
					query.find({ 
						success: function(results) {
							alert(results);
							return results.length;		
						},
						error: function(error) {
							alert(error);
							return 0;
						}	
					});		
				};

				function updateRanking(email, counter) {
					var Ranking = Parse.Object.extend("Ranking");
					var query = new Parse.Query(Ranking);
					query.equalTo("Email", email);		
					query.first({ 
						success: function(user) {
							user.set("Found", counter);
							user.save();
							return;
						},
						error: function(error) {
							alert(error);
						}	
					});	
				};

				app.get('/ranking', function(req, res) {
					var email = req.query.email;
					var counter = compute(email);
					updateRanking(email, counter);
					res.render('ranking', { count: counter });
				});

				app.get('/geocaches', function(req, res) {
					var moment = require('cloud/moment-with-locales.min.js');
					moment.locale('fr');
					app.locals.moment = moment; // this makes moment available as a variable in every EJS page
					var Log = Parse.Object.extend("Log");
					var queryLog = new Parse.Query(Log);
					queryLog.descending("createdAt");
					queryLog.limit(5); 
					queryLog.include("Geocache");
					queryLog.find({
						success: function(logs) {
							var Geocaches = Parse.Object.extend("Geocache");
							var query = new Parse.Query(Geocaches);
							query.equalTo("Active",true);
							query.descending("updatedAt");
							query.find({ 
								success: function(caches) {
									res.render('geocaches', { message: 'Les caches à trouver', geocaches:caches, logs:logs });
								}
							});
						}
					});
				});

				app.get('/geocaching', function(req, res) {
					res.render('geocaching', { message: 'Régles du jeu Geocaching' });
				});

				app.get('/geocache', function(req, res) {

					//var moment = require('moment');
					var moment = require('cloud/moment-with-locales.min.js');
					moment.locale('fr');
					
					var shortDateFormat = "dddd @ HH:mm"; // this is just an example of storing a date format once so you can change it in one place and have it propagate
					app.locals.moment = moment; // this makes moment available as a variable in every EJS page
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
							var geocachePhotoUrl = cache.get("Photo").url();
							var geocacheDescription = cache.get("Description");
							var geocacheIndice = cache.get("Indice");
							var geocacheSpoiler = cache.get("Spoiler").url();
							var geocacheGPS = cache.get("GPS");
							var geocacheCoordString = cache.get("GPSString");

							var Logs = Parse.Object.extend("Log");
							var queryLog = new Parse.Query(Logs);
							queryLog.equalTo("Geocache", cache);
							queryLog.descending("createdAt");
							queryLog.find({
								success: function(results) {
									res.render('geocache', { nom:geocacheName, d:geocacheDifficulty, t:geocacheTerrain, cat:geocacheCategory, size:geocacheSize, coord:geocacheCoordString, gps:geocacheGPS, description:geocacheDescription, indice:geocacheIndice, photo:geocachePhotoUrl, spoiler:geocacheSpoiler, logs:results });
									
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
					    // The object was retrieved successfully.
					    for (var i = 0; i < results.length; i++) { 
					    	var object = results[i];
					    }
					    var geocacheName = object.get("Nom");
					    var geocacheId = object.id;

					    res.render('foundit', { nom:geocacheName,id:geocacheId });
					} else {
						res.render('foundit', { nom:"Code invalide !", id:0 });
					}
				},
				error: function(object, error) {
				    	// The object was not retrieved successfully.
				    	// error is a Parse.Error with an error code and message.
				    	res.render('foundit', { nom:"Code invalide !", id:0 });
				    }	
				});
				});

				app.post('/found', function(req, res) {

					var Log = Parse.Object.extend("Log");
					var Geocache = Parse.Object.extend("Geocache");
					var logEntry = new Log();

					logEntry.set("Pseudo", req.body.name);
					logEntry.set("Email", req.body.email);
					logEntry.set("Message", req.body.message);
					logEntry.set("Date", new Date());
					var cache = new Geocache();
					cache.id = req.body.id;

					logEntry.set("Geocache", cache);

					if(req.body.fav == "true") {
						logEntry.set("Fav", true);
						cache.increment("Fav");
						cache.save();
					} else {
						logEntry.set("Fav", false);
					}

					logEntry.save(null, {
						success: function(logEntry) {
							res.render('found', { cacheid:cache.id, message:"Bravo " + req.body.name +" !<br><br>N'oubliez pas de signer aussi le logbook ;-)" });
						},
						error: function(logEntry, error) {
							res.render('found', { cacheid:0, message: error.message });
						}
					});		   

				});


				// Attach the Express app to Cloud Code.
				app.listen();
