# GeocachingJDS
Back Office épreuve Geocaching Jeux De Sophia

[Work In Progress]

## Requirements
- Mongodb v3.2+
- NodeJS (LTS 8.11 min) & optional use of NVM (https://github.com/creationix/nvm) 

## Build
```bash
git clone https://github.com/MariusMez/GeocachingJDS.git
cd GeocachingJDS && npm install
```


## DEV - Run with Docker

First copy your dump folder named 'geocaching_jds_prd' (wich contain bsons and .gz files) inside the folder dump_mongodb.
The database will be automatically populated.

Install with : `docker-compose run --rm parse npm install` when you update package.json you need to re-run this command.

Then just go with: `docker-compose up -d --build`

## PRODUCTION - Run with PM2

- We recommend using PM2 from http://pm2.keymetrics.io 
- Edit file ```ecosystem.json``` and change settings accordingly to your installation (contact me for the missing file, or read the PM2 documentation)
- Run  ```pm2 start ecosystem.json —watch```

## Monitor

- You can use ```pm2 monit``` / ```pm2 ls``` / ```pm2 stop all``` / ```pm2 delete all``` / ```pm2 start all``` / ...
- View logs: ```pm2 logs```
- Clearing logs: ```pm2 flush```

## Cleaning database files

Connect to Mongo cli : `mongo` then choose your db with: `show dbs` then `use db_name` and connect with `db.auth('user', 'password');`

First delete olds files: `db.fs.files.remove({"uploadDate": {$lt : ISODate("2017-11-10T20:32:13.743Z")}});`

Or delete big files: `db.fs.files.remove({"length": {$gt : 3000000}});`  > 3 Mo

Then in a mongo shell: 

```
function removeChunkIfNoOwner(chunk){
  //Look for the parent file
  var parentCount = db.fs.files.find({'_id' : chunk.files_id}).count();

  if (parentCount === 0 ){
     db.fs.chunks.remove({'_id': chunk._id});
     print("Removing chunk " + chunk._id);
  }
}
```

Select your database and remove orphaned chunks: `db.fs.chunks.find().forEach(removeChunkIfNoOwner);`


## Backuping Database

``` mongodump --username 'user' --password 'password' --db geocaching_jds_prd --gzip```

## Contribution

Pull requests or other contributions are welcome

## License

MIT

## Contact

Marius ([@mezphotos](https://twitter.com/mezphotos))
