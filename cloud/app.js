
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

			app.get('/geocaches', function(req, res) {
			  res.render('geocaches', { message: 'Les caches à trouver' });
			});

			app.get('/geocaching', function(req, res) {
			  res.render('geocaching', { message: 'Régles du jeu Geocaching' });
			});

			app.get('/geocache', function(req, res) {

				var Geocache = Parse.Object.extend("Geocache");
				var query = new Parse.Query(Geocache);
				query.get(req.query.id, {
			  		success: function(cache) {				 
					    var geocacheName = cache.get("Nom");
					   // var geocacheDifficulty = cache.get("Difficulty");
					   // var geocacheTerrain = cache.get("Terrain");
					   // var geocacheSize = cache.get("Size");
					   var geocachePhotoUrl = cache.get("Photo").url();
					    var geocacheDescription = cache.get("Description");
					    var geocacheSpoiler = cache.get("Spoiler").url();
					    var geocacheId = cache.id;

				        res.render('geocache', { nom:geocacheName, description:geocacheDescription, photo:geocachePhotoUrl, spoiler:geocacheSpoiler });
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
			    	res.render('foundit', { nom:"Code invalide !" });
			    }
				  	},
			  		error: function(object, error) {
			    	// The object was not retrieved successfully.
			    	// error is a Parse.Error with an error code and message.
			    	res.render('foundit', { nom:"Code invalide !" });
			  		}	
				});
			});

			app.post('/found', function(req, res) {

				var Log = Parse.Object.extend("Log");
				var Geocache = Parse.Object.extend("Geocache");
				var logEntry = new Log();

				logEntry.set("Pseudo", req.body.name);
				logEntry.set("Message", req.body.message);
				logEntry.set("Date", new Date());
				var cache = new Geocache();
				cache.id = req.body.id;
				logEntry.set("Geocache", cache);

				logEntry.save(null, {
				  success: function(logEntry) {
				    // Execute any logic that should take place after the object is saved.
				    //alert('New object created with objectId: ' + logEntry.id);
				    res.render('found', { message:"Merci pour la visite !" });
				  },
				  error: function(logEntry, error) {
				    // Execute any logic that should take place if the save fails.
				    // error is a Parse.Error with an error code and message.
					    res.render('found', { message: error.message });
				  }
				});		   
	/*

			   var Geocache = Parse.Object.extend("Geocache");
			   var query = new Parse.Query(Geocache);
			   query.get(req.body.id, {
			  		success: function(geocache) {
			  			
				    var geocacheName = geocache.get("Nom");
				    var geocacheId = geocache.id;
	 
				  	},
			  		error: function(object, error) {
			    	// The object was not retrieved successfully.
			    	// error is a Parse.Error with an error code and message.
			    	res.render('found', { message: error.message });
			  		}	
			 });
	*/
	});


			// // Example reading from the request query string of an HTTP get request.
			// app.get('/test', function(req, res) {
			//   // GET http://example.parseapp.com/test?message=hello
			//   res.send(req.query.message);
			// });

			// // Example reading from the request body of an HTTP post request.
			// app.post('/test', function(req, res) {
			//   // POST http://example.parseapp.com/test (with request body "message=hello")
			//   res.send(req.body.message);
			// });

			// Attach the Express app to Cloud Code.
			app.listen();
