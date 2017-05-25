
// These two lines are required to initialize Express in Cloud Code.
var express = require('express')
var bodyParser = require('body-parser')
//var multer  = require('multer')
var fileUpload = require('express-fileupload');
//var upload = multer()

var app = express()

// Global app configuration section
app.set('views', 'cloud/views')  // Specify the folder to find templates
app.set('view engine', 'ejs')    // Set the template engine
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
	extended: true
}))
app.use(fileUpload())

// This is an example of hooking up a request handler with a specific request
// path and HTTP verb using the Express routing API.
app.get('/', function (req, res) {
	res.render('index', { message: 'Page principale' })
})

app.get('/tools', function (req, res) {
	res.render('tools', { message: 'Outils application mobile' })
})

app.get('/ranking', function (req, res) {
	var Ranking = Parse.Object.extend('Ranking')
	var queryGeocacheurs = new Parse.Query(Ranking)
	var Geocache = Parse.Object.extend('Geocache')
	var queryGeocaches = new Parse.Query(Geocache)
	queryGeocacheurs.descending('Score, ScoreFTF, ScoreDT')
	queryGeocacheurs.limit(1000)
	queryGeocacheurs.find().then(function (rank) {
		queryGeocaches.equalTo('Active', true)
		queryGeocaches.descending('RatioFav,Ratio')
		queryGeocaches.find().then(function (caches) {
			queryGeocacheurs.descending('ScoreFTF')
			queryGeocacheurs.limit(1000)
			queryGeocacheurs.find().then(function (rankFTF) {
				res.render('ranking', { geocacheurs: rank, geocacheursFTF: rankFTF, geocaches: caches })
			})
		})
	})
})

app.get('/computefavratio', function (req, res) {
	var _ = require('cloud/underscore-min.js')

	var Logs = Parse.Object.extend('Log')
	var Geocache = Parse.Object.extend('Geocache')

	var queryGeocaches = new Parse.Query(Geocache)
	queryGeocaches.equalTo('Active', true)
	queryGeocaches.find().then(function (geocaches) {
		_.each(geocaches, function (geocache) {
			var query = new Parse.Query(Logs)
			query.equalTo('Geocache', geocache)
			query.count().then(function (counter) {
				var nbFav = geocache.get('Fav')
				var ratio = Math.round((nbFav / counter) * 100)
				geocache.set('RatioFav', ratio)
				geocache.save()
			})
		})
	}).then(function () {
		// res.render('index', { message: 'Page principale' });
	})
})

app.get('/computefav', function (req, res) {
	var _ = require('cloud/underscore-min.js')

	var Logs = Parse.Object.extend('Log')
	var Geocache = Parse.Object.extend('Geocache')

	var queryGeocaches = new Parse.Query(Geocache)
	// queryGeocaches.equalTo("Active", true);
	queryGeocaches.find().then(function (geocaches) {
		_.each(geocaches, function (geocache) {
			var query = new Parse.Query(Logs)
			query.equalTo('Geocache', geocache)
			query.equalTo('Fav', true)
			query.count().then(function (counter) {
				geocache.set('Fav', counter)
				geocache.save()
			})
		})
	}).then(function () {
		// res.render('index', { message: 'Page principale' });
	})
})

app.get('/computeratiodt', function (req, res) {
	var _ = require('cloud/underscore-min.js')

	var Logs = Parse.Object.extend('Log')
	var Ranking = Parse.Object.extend('Ranking')

	var queryGeocacheurs = new Parse.Query(Ranking)
	queryGeocacheurs.limit(200)
	queryGeocacheurs.find().then(function (geocacheurs) {
		_.each(geocacheurs, function (geocacheur) {
			var d = new Date(2016, 4, 30)
			var query = new Parse.Query(Logs)
			query.equalTo('Email', geocacheur.get('Email'))
			query.greaterThanOrEqualTo('createdAt', d)
			query.include('Geocache')
			query.find().then(function (logs) {
				var promise = Parse.Promise.as()
				var scoreDT = 0
				_.each(logs, function (log) {
					promise = promise.then(function () {
						scoreDT = scoreDT + log.get('Geocache').get('Difficulty') + log.get('Geocache').get('Terrain')
						return scoreDT
					})
				})
				return promise
			}).then(function (scoreDT) {
				geocacheur.set('ScoreDT', scoreDT)
				geocacheur.save()
			})
		})
	}).then(function () {
		// res.render('OK');
	})
})

app.get('/computeranking', function (req, res) {
	var _ = require('cloud/underscore-min.js')

	var scoreFoundIt = 20
	var scoreFTF = 3
	var scoreSTF = 2
	var scoreTTF = 1

	var Logs = Parse.Object.extend('Log')
	var Ranking = Parse.Object.extend('Ranking')

	var queryGeocacheurs = new Parse.Query(Ranking)
	queryGeocacheurs.limit(1000)
	queryGeocacheurs.find().then(function (geocacheurs) {
		_.each(geocacheurs, function (geocacheur) {
			var query = new Parse.Query(Logs)
			query.equalTo('Email', geocacheur.get('Email'))
			query.count().then(function (counter) {
				var scoreFTFSTFTTF = geocacheur.get('FTF') * scoreFTF + geocacheur.get('STF') * scoreSTF + geocacheur.get('TTF') * scoreTTF
				var score = counter * scoreFoundIt + scoreFTFSTFTTF + geocacheur.get('ScoreDT')
				geocacheur.set('Found', counter)
				geocacheur.set('Score', score)
				geocacheur.set('ScoreFTF', scoreFTFSTFTTF)
				geocacheur.save()
			})
		})
	}).then(function () {
		// res.render('OK');
	})
})

app.get('/geocaches', function (req, res) {
	var moment = require('cloud/moment-with-locales.min.js')
	moment.locale('fr')
	app.locals.moment = moment // this makes moment available as a variable in every EJS page
	var Log = Parse.Object.extend('Log')
	var queryLog = new Parse.Query(Log)
	queryLog.descending('createdAt')
	queryLog.limit(5)
	queryLog.include('Geocache')
	queryLog.find({
		success: function (logs) {
			var Geocaches = Parse.Object.extend('Geocache')
			var query = new Parse.Query(Geocaches)
			query.equalTo('Active', true)
			query.descending('RatioFav')
			query.find({
				success: function (caches) {
					res.render('geocaches', { message: 'Les caches à trouver', geocaches: caches, logs: logs })
				}
			})
		}
	})
})

app.get('/geocaching', function (req, res) {
	res.render('geocaching', { message: 'Régles du jeu Geocaching' })
})

app.get('/geocache', function (req, res) {
	// var moment = require('moment');
	var moment = require('cloud/moment-with-locales.min.js')
	moment.locale('fr')
	var shortDateFormat = 'dddd @ HH:mm' // this is just an example of storing a date format once so you can change it in one place and have it propagate
	app.locals.moment = moment // this makes moment available as a variable in every EJS page
	app.locals.shortDateFormat = shortDateFormat

	var Geocache = Parse.Object.extend('Geocache')
	var query = new Parse.Query(Geocache)
	query.get(req.query.id, {
		success: function (cache) {
			var geocacheName = cache.get('Nom')
			var geocacheDifficulty = cache.get('Difficulty')
			var geocacheTerrain = cache.get('Terrain')
			var geocacheSize = cache.get('Size')
			var geocacheCategory = cache.get('Category')
			var geocachePhotoUrl = cache.get('Photo').url()
			var geocacheDescription = cache.get('Description')
			var geocacheIndice = cache.get('Indice')
			var geocacheSpoiler = cache.get('Spoiler').url()
			var geocacheGPS = cache.get('GPS')
			var geocacheCoordString = cache.get('GPSString')
			var geocacheFav = cache.get('Fav')

			var Logs = Parse.Object.extend('Log')
			var queryLog = new Parse.Query(Logs)
			queryLog.equalTo('Geocache', cache)
			queryLog.descending('createdAt')
			queryLog.find({
				success: function (results) {
					res.render('geocache', { nom: geocacheName, fav: geocacheFav, d: geocacheDifficulty, t: geocacheTerrain, cat: geocacheCategory, size: geocacheSize, coord: geocacheCoordString, gps: geocacheGPS, description: geocacheDescription, indice: geocacheIndice, photo: geocachePhotoUrl, spoiler: geocacheSpoiler, logs: results })
				},
				error: function (object, error) {
					res.render('geocaches', { message: 'Redirection toutes les caches' })
				}
			})
		},
		error: function (object, error) {
			res.render('geocaches', { message: 'Redirection toutes les caches' })
		}
	})
})

app.get('/foundit', function (req, res) {
	var Geocache = Parse.Object.extend('Geocache')
	var query = new Parse.Query(Geocache)
	query.equalTo('codeId', req.query.id)
	query.find({
		success: function (results) {
			if (results.length > 0) {
	    		// The object was retrieved successfully.
	    		for (var i = 0; i < results.length; i++) {
	    			var object = results[i]
	    		}
	    		var geocacheName = object.get('Nom')
	    		var geocacheId = object.id

	    		res.render('foundit', { nom: geocacheName, id: geocacheId })
	    	} else {
	    		res.render('foundit', { nom: 'Code invalide !', id: 0 })
	    	}
	    },
	    error: function (object, error) {
	    	res.render('foundit', { nom: 'Code invalide !', id: 0 })
	    }
	})
})

//app.post('/found', upload.single('pic'), function (req, res, next) {
app.post('/found', function (req, res) {
	var Log = Parse.Object.extend('Log')
	var Geocache = Parse.Object.extend('Geocache')
	var logEntry = new Log()

//	if (req.file.size > 0) {
		var photoFile = req.files.pic
		var name = req.files.pic.name//photoFile.originalname
		var parseFile = new Parse.File(name, photoFile)
		parseFile.save().then(function () {
			console.log("Photo saved")
			console.log(parseFile.url())
			logEntry.set('Photo', parseFile)
			},
			function (error) {
				console.log("Photofile save error " + error.message);
				res.render('found', { cacheid: 0, message: error.message })
			}
		)
//	}

	logEntry.set('Pseudo', req.body.name)
	logEntry.set('Email', req.body.email)
	logEntry.set('Message', req.body.message)
	logEntry.set('Date', new Date())
	var cache = new Geocache()
	cache.id = req.body.id

	logEntry.set('Geocache', cache)

	if (req.body.fav == 'true') {
		logEntry.set('Fav', true)
		cache.increment('Fav')
		cache.save()
	} else {
		logEntry.set('Fav', false)
	}

	logEntry.save(null, {
		success: function (logEntry) {
			res.render('found', { cacheid: cache.id, message: 'Bravo ' + req.body.name + " !<br><br>N'oubliez pas de signer aussi le logbook ;-)" })
		},
		error: function (logEntry, error) {
			res.render('found', { cacheid: 0, message: error.message })
		}
	})
})

// Attach the Express app to Cloud Code.
app.listen()
