//require('./app.js');

// Use Parse.Cloud.define to define as many cloud functions as you want.
// For example:
Parse.Cloud.define("hello", function(request, response) {
  response.success("Hello world!");
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

