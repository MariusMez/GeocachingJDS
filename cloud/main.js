var jds = require('../geocaching-jds');


Parse.Cloud.beforeSave("Log", async (request) => {
	if(request.object.isNew()) { 
		var photo = request.object.get("Photo");
		console.log("PHOTO:" + photo)
		if(photo) {
			console.log("IN PHOTO")
	    	const sharp = require('sharp');
			const maxWidth = 1000;
			const maxHeight = 1000;
		    const response = await Parse.Cloud.httpRequest({ url: photo.url() });
		    const thumbnail = jds.createThumbnail(response.buffer, maxWidth, maxHeight);
		    if(thumbnail) {
		    	console.log("IN THUMBNAIL")
		    	request.object.set("Photo", thumbnail);
		    	request.object.set("PhotoUrl", thumbnail.url({forceSecure: true}));
		    }
	    } 
	}
});


Parse.Cloud.job("Resize all PhotoLog", async (request) => {
	request.message("I just started");
	const sharp = require('sharp');
	const Log = Parse.Object.extend("Log");
	const query = new Parse.Query(Log);
	query.lessThanOrEqualTo("createdAt", new Date());
	query.equalTo("Active", true);
	query.doesNotExist("PhotoResized");
	query.limit(10000);
	query.exists("PhotoUrl");
	const logs = await query.find();
	console.log("Processing " + logs.length + " logs...");
	const promises = logs.map(async (log) => {
		var photoFile = log.get("Photo");
		log.set("Photo", photoFile);
		log.set("PhotoResized", true);
		await log.save(null);
		request.message('Resized ' + photoFile);
	});
	await Promise.all(promises)
	request.message("I just finished");
});

Parse.Cloud.job("Add Geocacheurs from CSV file", async (request) => {
	request.message("I just started");
	var csv = require('csv'); 
	var obj = csv(); 

	var Geocacheur = Parse.Object.extend("Geocacheur");
	var Ranking = Parse.Object.extend("Ranking");

	obj.from.path('Geocacheurs.csv').to.array(function(geocacheurs) {
		geocacheurs.forEach( async (geocacheur) => {
			var firstname = geocacheur[0];
			var companyname = geocacheur[1];
			var email = geocacheur[2].toLowerCase();

			var query = new Parse.Query(Geocacheur);
			query.equalTo('Email', email);
			const result = await query.first();

			if (result === undefined) {
				var geocacheur = new Geocacheur();
				geocacheur.save({
					Email: email,
					Pseudo: firstname,
					Company: companyname,
					Enrollment: "preload",
					Active: false
				}).then((user) => {
					var queryRanking = new Parse.Query(Ranking);
					queryRanking.equalTo('Geocacheur', user);
					queryRanking.first().then((res) => {
						if (res === undefined) {
							jds.saveRanking(user, false).then(function() { }, function(error) { });
						} else {
							// Update ranking ?
							console.log("Update ranking");
						}
					}, (error) => {
					 	console.error(error); 
					});
				}, (error) => { 
					console.error(error); 
				});						
			} else {
				console.log("Geocacheur exist, we do nothing");
				//results.set("Active", false);
				//results.save(null, { useMasterKey: true }).then(response.success, response.error);
			}
		});
	});
	request.message("I just finished");
});

Parse.Cloud.job("First - Compute Score Ratio D/T", (request) => {

	request.message("I just started Compute Ratio D/T");

	var Logs = Parse.Object.extend("Log");
	var Ranking = Parse.Object.extend("Ranking");

	var queryRanking = new Parse.Query(Ranking);
	queryRanking.equalTo("Active", true);
	queryRanking.limit(1000);
	queryRanking.find().then((ranking) => {
		ranking.forEach((rank) => {
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

			}).then((scoreDT) => {							    
				rank.set("ScoreDT", scoreDT);
				rank.save(null);
			});
		});
	}).then((result) => {
		request.message("I just finished");
	}, (error) => {
		console.error(error);
	});
});


Parse.Cloud.job("Compute Fav Points", async (request) => {

	request.message("I just started Compute Fav Points");

	var Logs = Parse.Object.extend("Log");
	var Geocache = Parse.Object.extend("Geocache");

	var queryGeocaches = new Parse.Query(Geocache);
	queryGeocaches.limit(1000);
	queryGeocaches.equalTo("Active", true);
	queryGeocaches.find().then(async (geocaches) => {
		geocaches.forEach(async (geocache) => {
			var query = new Parse.Query(Logs);
			query.equalTo("Active", true);
			query.limit(100000);
			query.equalTo("Geocache", geocache);
			query.equalTo("Fav", true);
			query.count().then(async (counter) => { 
				geocache.set("Fav", counter);
				await geocache.save(null);
			});
		});
	}).then((result) =>{
		request.message("I just finished");
	}, (error) => {
		console.error(error);
	});
});

Parse.Cloud.job("Compute Fav Ratio", async (request) => {

	request.message("I just started Compute Fav Ratio");
	
	var Logs = Parse.Object.extend("Log");
	var Geocache = Parse.Object.extend("Geocache");

	var queryGeocaches = new Parse.Query(Geocache);
	queryGeocaches.equalTo("Active", true);
	queryGeocaches.find().then((geocaches) => {
		geocaches.forEach((geocache) => {
			var query = new Parse.Query(Logs);
			query.equalTo("Active", true);
			query.limit(100000);
			query.equalTo("Geocache", geocache);
			query.count().then(async (counter) => {
				var nbFav = geocache.get("Fav"); 
				var ratio =  Math.round((nbFav / counter) * 100); 
				geocache.set("RatioFav", ratio);
				await geocache.save(null);
			});
		});
	}).then((result) => {
		request.message("I just finished");
	}, function(error) {
		console.error(error);
	});
});

Parse.Cloud.job("Compute All rankings", (request) => {
  request.message("I just started Compute All Rankings");
  var Geocacheur = Parse.Object.extend("Geocacheur");
  var queryGeocacheurs = new Parse.Query(Geocacheur);
  queryGeocacheurs.equalTo("Active", true);
  queryGeocacheurs.limit(1000);
  queryGeocacheurs.find().then((geocacheurs) => {
        var promisesScores = [];
        var counter = 0;
        geocacheurs.forEach((geocacheur) => {
            counter = counter + 1;
            var email = geocacheur.get("Email");
            request.message("Processing " + email + " " + counter + "/" + geocacheurs.length);
            console.log("Processing " + email + " " + counter + "/" + geocacheurs.length);
            promisesScores.push(jds.computeScoreForGeocacheur(email));
        });

        return Parse.Promise.all(promisesScores);
    }).then((scores) => {
	    console.log("in function with " + scores.length + " scores ");
	    var promisesStore = [];
	    var counter = 0;
	    scores.forEach((score) => {
            counter = counter + 1;
            const email = score.geocacheur.get("Email");
            request.message("Storing " + email + " - " + counter + "/" + scores.length);
            console.log("Storing " + email + " - " + counter + "/" + scores.length);

            promisesStore.push(jds.saveOrUpdateRanking2(score));
	    });
	    return Parse.Promise.all(promisesStore);
  	}).then((results) => {
	  	console.log("termine with " + results.length);
	  	request.message("I just finished");
  		}, (error) => {
  			console.error(error);
  		});
});

Parse.Cloud.job("Last - Compute Ranking", async (request) => {
	request.message("I just started Compute Ranking");
	const scoreFoundIt = 20;
	const scoreFTF = 3;
	const scoreSTF = 2;
	const scoreTTF = 1;

	var Logs = Parse.Object.extend("Log");
	var Ranking = Parse.Object.extend("Ranking");

	var queryRanking = new Parse.Query(Ranking);
	queryRanking.equalTo("Active", true);
	queryRanking.limit(1000);
	queryRanking.find().then((rankings) => {
		rankings.forEach((rank) => {
			var query = new Parse.Query(Logs);
			query.equalTo("Email", rank.get("Email"));
			query.equalTo("Active", true);
			query.greaterThanOrEqualTo("createdAt", new Date("2018-05-10"));
			query.limit(10000);
			query.count().then(async (counter) => { 
				var scoreFTFSTFTTF = rank.get("FTF") * scoreFTF + rank.get("STF") * scoreSTF + rank.get("TTF") * scoreTTF;
				var score = counter * scoreFoundIt + scoreFTFSTFTTF + rank.get("ScoreDT") + rank.get("ScoreTB");
				rank.set("Found", counter);
				rank.set("Score", score);
				rank.set("ScoreFTF", scoreFTFSTFTTF);
				await rank.save(null);
			});
		});
	}).then((result) => {
		request.message("I just finished");
	}, function(error) {
		console.error(error);
	});
});
