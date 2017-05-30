//require('./app.js');

// Use Parse.Cloud.define to define as many cloud functions as you want.
// For example:
Parse.Cloud.define("hello", function(request, response) {
	response.success("Hello world!");
});


Parse.Cloud.job("computeratiodt", function(request, status) {
  // the params passed through the start request
  var params = request.params;
  // Headers from the request that triggered the job
  var headers = request.headers;

  // get the parse-server logger
  var log = request.log;
  var _ = require('underscore-min.js');

  // Update the Job status message
  status.message("I just started");

  var Logs = Parse.Object.extend("Log");
  var Ranking = Parse.Object.extend("Ranking");

  var queryGeocacheurs = new Parse.Query(Ranking);
  queryGeocacheurs.equalTo("Active", true);
  //queryGeocacheurs.limit(1000);
  queryGeocacheurs.find().then(function(geocacheurs) {

  	_.each(geocacheurs, function(geocacheur) {
  		var query = new Parse.Query(Logs);
  		query.equalTo("Email", geocacheur.get("Email"));
  		query.include('Geocache');
  		query.find().then(function(logs) { 

  			var promise = Parse.Promise.as();
  			var scoreDT = 0;
  			_.each(logs, function(log) {
  				promise = promise.then(function() {
  					scoreDT = scoreDT + log.get("Geocache").get("Difficulty") + log.get("Geocache").get("Terrain");
  					return scoreDT;
  				});								
  			});
  			return promise;

  		}).then(function(scoreDT) {							    
  			geocacheur.set("ScoreDT", scoreDT);
  			geocacheur.save();
  		});
  	});
  }).then(function(result) {
    // Mark the job as successful
    // success and error only support string as parameters
    status.success("I just finished");
}, function(error) {
    // Mark the job as errored
    status.error("There was an error");
})

});


Parse.Cloud.job("computefav", function(request, status) {
  // the params passed through the start request
  var params = request.params;
  // Headers from the request that triggered the job
  var headers = request.headers;

  // get the parse-server logger
  var log = request.log;
  var _ = require('underscore-min.js');

  // Update the Job status message
  status.message("I just started");

  var Logs = Parse.Object.extend("Log");
  var Geocache = Parse.Object.extend("Geocache");

  var queryGeocaches = new Parse.Query(Geocache);
	//queryGeocaches.equalTo("Active", true);
	queryGeocaches.find().then(function(geocaches) {

		_.each(geocaches, function(geocache) {
			var query = new Parse.Query(Logs);
			query.equalTo("Geocache", geocache);
			query.equalTo("Fav", true);
			query.count().then(function(counter) { 
				geocache.set("Fav", counter);
				geocache.save();
			});
		});
	}).then(function(result) {
    // Mark the job as successful
    // success and error only support string as parameters
    status.success("I just finished");
}, function(error) {
    // Mark the job as errored
    status.error("There was an error");
})

});

Parse.Cloud.job("computefavratio", function(request, status) {
  // the params passed through the start request
  var params = request.params;
  // Headers from the request that triggered the job
  var headers = request.headers;

  // get the parse-server logger
  var log = request.log;
  var _ = require('underscore-min.js');

  // Update the Job status message
  status.message("I just started");
  var Logs = Parse.Object.extend("Log");
  var Geocache = Parse.Object.extend("Geocache");

  var queryGeocaches = new Parse.Query(Geocache);
  queryGeocaches.equalTo("Active", true);
  queryGeocaches.find().then(function(geocaches) {

  	_.each(geocaches, function(geocache) {
  		var query = new Parse.Query(Logs);
  		query.equalTo("Geocache", geocache);
  		query.count().then(function(counter) {
  			var nbFav = geocache.get("Fav"); 
  			var ratio =  Math.round((nbFav / counter) * 100); 
  			geocache.set("RatioFav", ratio);
  			geocache.save();
  		});
  	});
  }).then(function(result) {
    // Mark the job as successful
    // success and error only support string as parameters
    status.success("I just finished");
}, function(error) {
    // Mark the job as errored
    status.error("There was an error");
})

});

Parse.Cloud.job("computeranking", function(request, status) {
  // the params passed through the start request
  var params = request.params;
  // Headers from the request that triggered the job
  var headers = request.headers;

  // get the parse-server logger
  var log = request.log;
  var _ = require('underscore-min.js');

  // Update the Job status message
  status.message("I just started");
  var scoreFoundIt = 20;
	var scoreFTF = 3;
	var scoreSTF = 2;
	var scoreTTF = 1;

	var Logs = Parse.Object.extend("Log");
	var Ranking = Parse.Object.extend("Ranking");

	var queryGeocacheurs = new Parse.Query(Ranking);
	queryGeocacheurs.equalTo("Active", true);
	queryGeocacheurs.limit(1000);
	queryGeocacheurs.find().then(function(geocacheurs) {

		_.each(geocacheurs, function(geocacheur) {
			var query = new Parse.Query(Logs);
			query.equalTo("Email", geocacheur.get("Email"));
			query.count().then(function(counter) { 
				var scoreFTFSTFTTF = geocacheur.get("FTF") * scoreFTF + geocacheur.get("STF") * scoreSTF + geocacheur.get("TTF") * scoreTTF;
				var score = counter * scoreFoundIt + scoreFTFSTFTTF + geocacheur.get("ScoreDT");
				geocacheur.set("Found", counter);
				geocacheur.set("Score", score);
				geocacheur.set("ScoreFTF", scoreFTFSTFTTF);
				geocacheur.save();
			});
		});
	}).then(function(result) {
    // Mark the job as successful
    // success and error only support string as parameters
    status.success("I just finished");
}, function(error) {
    // Mark the job as errored
    status.error("There was an error");
})

});
