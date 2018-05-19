var jds = require('../geocaching-jds');

// Use Parse.Cloud.define to define as many cloud functions as you want.
// For example:
Parse.Cloud.define("hello", function(request, response) {
	response.success("Hello world!");
});

function processPhoto(request, response) {
	const sharp = require('sharp');
	const maxWidth = 1280;
	const maxHeight = 1280;
	
	var photo = request.object.get("Photo");
    if(photo === undefined) {
        response.success();
    } else {
    	var url = photo.url();
    }

    Parse.Cloud.httpRequest({ url: url }).then(function(response) {
   		return response.buffer;
	}).then(function(image_buffer) {
		jds.createThumbnail(image_buffer, maxWidth, maxHeight).then(function(thumbnail) {
		    request.object.set("Photo", thumbnail);
    		request.object.set("PhotoUrl", thumbnail.url({forceSecure: true}));
			response.success();
		    }, function(error) {
		        console.error("Thumbnail creation error: " + error.message);
		        response.error();
		    });
	});
}

Parse.Cloud.beforeSave("Log", function(request, response) {
	if(request.object.isNew()) { processPhoto(request, response); } else { response.success(); }
});

Parse.Cloud.beforeSave("Travelbug", function(request, response) {
	if(request.object.isNew()) { processPhoto(request, response); } else { response.success(); }
});

Parse.Cloud.beforeSave("TravelbugLog", function(request, response) {
	if(request.object.isNew()) { processPhoto(request, response); } else { response.success(); }
});

Parse.Cloud.job("Resize all PhotoLog", function(request, response) {
	response.message("I just started");
	const sharp = require('sharp');

	var Log = Parse.Object.extend("Log");
	var queryLog = new Parse.Query(Log);
	queryLog.lessThanOrEqualTo("createdAt", new Date());
	queryLog.equalTo("Active", true);
	queryLog.doesNotExist("PhotoResized");
	queryLog.limit(10000);
	queryLog.exists("PhotoUrl");
	queryLog.find({
		success: function(logs) {
			console.log("Processing " + logs.length + " logs...");
			logs.forEach(function(log) {
				var photoFile = log.get("Photo");
				log.set("Photo", photoFile);
				log.set("PhotoResized", true);
				log.save();
			});
			response.success("I just finished");
		},
		error: function(error) {
			response.error(error);
		}
	});
});

Parse.Cloud.job("Add Geocacheurs from CSV file", function(request, response) {
	response.message("I just started");
	var csv = require('csv'); 
	var obj = csv(); 

	var Geocacheur = Parse.Object.extend("Geocacheur");
	var Ranking = Parse.Object.extend("Ranking");

	obj.from.path('Geocacheurs.csv').to.array(function(geocacheurs) {
		geocacheurs.forEach(function(geocacheur) {
			var firstname = geocacheur[0];
			var companyname = geocacheur[1];
			var email = geocacheur[2].toLowerCase();

			var query = new Parse.Query(Geocacheur);
			query.equalTo('Email', email);
			query.first({
				success: function(result) {
					//console.log(JSON.stringify(result));
					if (result === undefined) {
						var geocacheur = new Geocacheur();
						geocacheur.save({
							Email: email,
							Pseudo: firstname,
							Company: companyname,
							Enrollment: "preload",
							Active: false
						}, {
							success: function(user) {
								var queryRanking = new Parse.Query(Ranking);
								queryRanking.equalTo('Geocacheur', user);
								queryRanking.first({
									success: function(res) {
										if (res === undefined) {
											jds.saveRanking(user, false).then(function() { }, function(error) { });
										} else {
											// Update ranking ?
											console.log("Update ranking");
										}
									},
									error: function(error) { console.error(error); }
								});
							},
							error: function(error) { console.error(error); }
						});						
					} else {
						console.log("Geocacheur exist, we do nothing");
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

Parse.Cloud.job("Add TB Tracking Codes from txt file", function(request, response) {
	response.message("I just started Add TB Tracking Codes from txt file");
	
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
					if (results === undefined) {
						var tbCode = new TravelbugCode();
						tbCode.save({ Code: code, Active: false }, 
						{
							success: function(code) { },
							error: function(error) { }
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

Parse.Cloud.job("First - Compute Score Ratio D/T", function(request, status) {

	status.message("I just started Compute Ratio D/T");

	var Logs = Parse.Object.extend("Log");
	var Ranking = Parse.Object.extend("Ranking");

	var queryRanking = new Parse.Query(Ranking);
	queryRanking.equalTo("Active", true);
	queryRanking.limit(1000);
	queryRanking.find().then(function(ranking) {

		ranking.forEach(function(rank) {
			var query = new Parse.Query(Logs);
			query.equalTo("Email", rank.get("Email"));
			query.equalTo("Active", true);
			query.greaterThanOrEqualTo("createdAt", new Date("2018-05-10"));
			query.limit(100000);
			query.include('Geocache');
			query.find().then(function(logs) { 

				var promise = Parse.Promise.as();
				var scoreDT = 0;
				logs.forEach(function(log) {
					promise = promise.then(function() {
						scoreDT = scoreDT + log.get("Geocache").get("Difficulty") + log.get("Geocache").get("Terrain");
						return scoreDT;
					});								
				});
				return promise;

			}).then(function(scoreDT) {							    
				rank.set("ScoreDT", scoreDT);
				rank.save();
			});
		});
	}).then(function(result) {
		status.success("I just finished");
	}, function(error) {
		status.error(error);
	});
});


Parse.Cloud.job("Compute Fav Points", function(request, status) {

	status.message("I just started Compute Fav Points");

	var Logs = Parse.Object.extend("Log");
	var Geocache = Parse.Object.extend("Geocache");

	var queryGeocaches = new Parse.Query(Geocache);
	queryGeocaches.limit(1000);
	queryGeocaches.equalTo("Active", true);
	queryGeocaches.find().then(function(geocaches) {

		geocaches.forEach(function(geocache) {
			var query = new Parse.Query(Logs);
			query.equalTo("Active", true);
			query.limit(100000);
			query.equalTo("Geocache", geocache);
			query.equalTo("Fav", true);
			query.count().then(function(counter) { 
				geocache.set("Fav", counter);
				geocache.save();
			});
		});
	}).then(function(result) {
		status.success("I just finished");
	}, function(error) {
		status.error(error);
	});
});

Parse.Cloud.job("Compute Fav Ratio", function(request, status) {

	status.message("I just started Compute Fav Ratio");
	
	var Logs = Parse.Object.extend("Log");
	var Geocache = Parse.Object.extend("Geocache");

	var queryGeocaches = new Parse.Query(Geocache);
	queryGeocaches.equalTo("Active", true);
	queryGeocaches.find().then(function(geocaches) {

		geocaches.forEach(function(geocache) {
			var query = new Parse.Query(Logs);
			query.equalTo("Active", true);
			query.limit(100000);
			query.equalTo("Geocache", geocache);
			query.count().then(function(counter) {
				var nbFav = geocache.get("Fav"); 
				var ratio =  Math.round((nbFav / counter) * 100); 
				geocache.set("RatioFav", ratio);
				geocache.save();
			});
		});
	}).then(function(result) {
		status.success("I just finished");
	}, function(error) {
		status.error(error);
	});
});

Parse.Cloud.job("Second - Compute Score TB", function(request, status) {

	status.message("I just started Compute Score TB");

	var TravelbugLog = Parse.Object.extend("TravelbugLog");
	var queryTbs = new Parse.Query(TravelbugLog);

	const nbPointsMission = 5;
	const nbPointsNewTBDiscover = 10;
	const nbPointsFirstCacheVisit = 10;
	const nbPointsTBOwnerByMove = 2;
	const nbPointsFavTB = 2;

	var Ranking = Parse.Object.extend("Ranking");
	var queryRanking = new Parse.Query(Ranking);
	queryRanking.equalTo("Active", true);
	queryRanking.limit(1000);
	queryRanking.find().then(function(rankings) {
		rankings.forEach(function(rank) {
			queryTbs.equalTo("Active", true);
			queryTbs.equalTo("Action", "drop");
			queryTbs.include("Travelbug");
			queryTbs.limit(10000);
			queryTbs.find().then(function(mylogs) {
				var scoreTb = { drop:0, dropTB:0, dropgc:0, missions:0, fav:0, owner:0};
			
				var promise = Parse.Promise.as();
				var email = rank.get("Email");
				
		  		mylogs.forEach(function(log) {
					promise = promise.then(function() {
						if (log.get("Email") == email) {
							scoreTb.dropTB = scoreTb.dropTB + nbPointsFirstCacheVisit*log.get("NewCache");
							scoreTb.dropgc = scoreTb.dropgc + nbPointsNewTBDiscover*log.get("NewTB");
							if (log.get("Mission") != undefined) {
				  				scoreTb.missions = scoreTb.missions + nbPointsMission * log.get("Mission");													
							}
						}  			
		  				if (log.get("Travelbug").get("OwnerEmail") == email) {
			  				scoreTb.fav = scoreTb.fav + log.get("Fav") * nbPointsFavTB; 	  	
			  				scoreTb.owner = scoreTb.owner + nbPointsTBOwnerByMove;				
		  				}
		  				return scoreTb;
		  			});	
		  		});		
				return promise;
			}).then(function(scoreTb) {
				if (scoreTb == undefined) {
					scoreTb = { dropTB:0, dropgc:0, missions:0, fav:0, owner:0};
				}
				var scoreTbTotal = scoreTb.dropTB + scoreTb.dropgc + scoreTb.missions + scoreTb.fav + scoreTb.owner;
				rank.set("ScoreTB", scoreTbTotal);
				rank.save();
			});
		});
	}).then(function(result) {
		status.success("I just finished");
	}, function(error) {
		status.error(error);
	});
});


Parse.Cloud.job("Compute All rankings", function(request, status) {
  status.message("I just started Compute All Rankings");

  var Geocacheur = Parse.Object.extend("Geocacheur");
  
  
  

  var queryGeocacheurs = new Parse.Query(Geocacheur);
  queryGeocacheurs.equalTo("Active", true);
  queryGeocacheurs.limit(1000);
  queryGeocacheurs.find()
    .then(
      function(geocacheurs) {

        var promisesScores = [];
        var counter = 0;

        geocacheurs.forEach(
          function(geocacheur) {

            counter = counter + 1;
            var email = geocacheur.get("Email");

            status.message("Processing " + email + " " + counter + "/" + geocacheurs.length);
            console.log("Processing " + email + " " + counter + "/" + geocacheurs.length);


            promisesScores.push(jds.computeScoreForGeocacheur(email));
          }
        );

        return Parse.Promise.all(promisesScores);
      }
    )
.then(
  function(scores) {
    console.log("in function with " + scores.length + " scores ");
    var promisesStore = [];
    var counter = 0;

    scores.forEach(
      function(score) {
            counter = counter + 1;
            var email = score.geocacheur.get("Email");

            status.message("Storing " + email + " - " + counter + "/" + scores.length);
            console.log("Storing " + email + " - " + counter + "/" + scores.length);


            promisesStore.push(jds.saveOrUpdateRanking2(score));
      }
    );

    return Parse.Promise.all(promisesStore);

  })
.then(function(results) {
  console.log("termine with " + results.length);
  status.success("I just finished");
  }, function(error) {
  status.error(error);
  });

});

Parse.Cloud.job("Last - Compute Ranking", function(request, status) {

	status.message("I just started Compute Ranking");

	var scoreFoundIt = 20;
	var scoreFTF = 3;
	var scoreSTF = 2;
	var scoreTTF = 1;

	var Logs = Parse.Object.extend("Log");
	var Ranking = Parse.Object.extend("Ranking");

	var queryRanking = new Parse.Query(Ranking);
	queryRanking.equalTo("Active", true);
	queryRanking.limit(1000);
	queryRanking.find().then(function(rankings) {

		rankings.forEach(function(rank) {
			var query = new Parse.Query(Logs);
			query.equalTo("Email", rank.get("Email"));
			query.equalTo("Active", true);
			query.greaterThanOrEqualTo("createdAt", new Date("2018-05-10"));
			query.limit(10000);
			query.count().then(function(counter) { 
				var scoreFTFSTFTTF = rank.get("FTF") * scoreFTF + rank.get("STF") * scoreSTF + rank.get("TTF") * scoreTTF;
				var score = counter * scoreFoundIt + scoreFTFSTFTTF + rank.get("ScoreDT") + rank.get("ScoreTB");
				rank.set("Found", counter);
				rank.set("Score", score);
				rank.set("ScoreFTF", scoreFTFSTFTTF);
				rank.save();
			});
		});
	}).then(function(result) {
		status.success("I just finished");
	}, function(error) {
		status.error(error);
	});
});
