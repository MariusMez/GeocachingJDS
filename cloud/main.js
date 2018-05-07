// Use Parse.Cloud.define to define as many cloud functions as you want.
// For example:
Parse.Cloud.define("hello", function(request, response) {
	response.success("Hello world!");
});

Parse.Cloud.job("addgeocacheurs", function(request, response) {
  response.message("I just started");
  var csv = require('csv'); 
  var obj = csv(); 

  var Geocacheur = Parse.Object.extend("Geocacheur");

  obj.from.path('Geocacheurs.csv').to.array(function(geocacheurs) {
    geocacheurs.forEach(function(geocacheur) {
      var firstname = geocacheur[0];
      var companyname = geocacheur[1];
      var email = geocacheur[2].toLowerCase();

      var query = new Parse.Query(Geocacheur);
      query.equalTo('Email', email);
      query.first({
          success: function(results) {
              // console.log(JSON.stringify(results));
              // console.log(results)
              if (results === undefined) {
                  var geocacheur = new Geocacheur();
                  geocacheur.save({
                      Email: email,
                      Pseudo: firstname,
                      Company: companyname,
                      Enrollment: "preload",
                      Active: false
                  }, {
                      success: function(user) {
                          // response.success("Geocacher added");
                      },
                      error: function(error) {
                          //response.error("Saving Geocacher");
                      }
                  });
              } else {
                // Geocacheur exist, we do nothing
                //results.set("Active", false);
                //results.save(null, { useMasterKey: true }).then(response.success, response.error);
              }
          },
          error: function(error) {
              error.message("Impossible to find Geocacheur - lookup failed");
              response.error(error);
          }
      });
    });
  });
  response.success("I just finished");
});

Parse.Cloud.job("addcodestb", function(request, response) {
  response.message("I just started");
  
  var params = request.params;
  var headers = request.headers;
  var log = request.log;
  var fs = require('fs');
  var TravelbugCode = Parse.Object.extend("TravelbugCode");

  fs.readFile('TB_CODES.txt', 'utf8', function(err, data) {
    if (err) throw err;
    codes = data.split(/\n/);
    codes.forEach(function(code) {
      var query = new Parse.Query("TravelbugCode");
      query.equalTo('Code', code);
      query.first({
          success: function(results) {
              // console.log(JSON.stringify(results));
              // console.log(results)
              if (results === undefined) {
                  var tbCode = new TravelbugCode();
                  tbCode.save({
                      Code: code,
                      Active: false
                  }, {
                      success: function(code) {
                          //response.success(results);
                      },
                      error: function(favourites, error) {
                          //response.error(error);
                      }
                  });
              } else {
                  //results.set("Active", false);
                  results.set("Code", code);
                  results.save(null, { useMasterKey: true }).then(response.success, response.error);
              }
          },
          error: function(error) {
              error.message("favourites lookup failed");
              response.error(error);
          }
      });
    });
  });
  response.success("I just finished");
});

Parse.Cloud.job("computeratiodt", function(request, status) {
  // the params passed through the start request
  var params = request.params;
  // Headers from the request that triggered the job
  var headers = request.headers;

  // get the parse-server logger
  var log = request.log;
  var _ = require('./underscore-min.js');

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
  		query.equalTo("Active", true);
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
  var _ = require('./underscore-min.js');

  // Update the Job status message
  status.message("I just started");

  var Logs = Parse.Object.extend("Log");
  var Geocache = Parse.Object.extend("Geocache");

  var queryGeocaches = new Parse.Query(Geocache);
	//queryGeocaches.equalTo("Active", true);
	queryGeocaches.find().then(function(geocaches) {

		_.each(geocaches, function(geocache) {
			var query = new Parse.Query(Logs);
			query.equalTo("Active", true);
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
  var _ = require('./underscore-min.js');

  // Update the Job status message
  status.message("I just started");
  var Logs = Parse.Object.extend("Log");
  var Geocache = Parse.Object.extend("Geocache");

  var queryGeocaches = new Parse.Query(Geocache);
  queryGeocaches.equalTo("Active", true);
  queryGeocaches.find().then(function(geocaches) {

  	_.each(geocaches, function(geocache) {
  		var query = new Parse.Query(Logs);
  		query.equalTo("Active", true);
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
  var params = request.params;
  var headers = request.headers;

  // get the parse-server logger
  var log = request.log;
  var _ = require('./underscore-min.js');

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
  		query.equalTo("Active", true);
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
    status.success("I just finished");
}, function(error) {
    status.error("There was an error");
})

});
