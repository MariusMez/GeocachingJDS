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

## Run

- We recommend using PM2 from http://pm2.keymetrics.io 
- Edit file ```ecosystem.json``` and change settings accordingly to your installation
- Run  ```pm2 start ecosystem.json —watch```

## Monitor

- You can use ```pm2 monit``` / ```pm2 ls``` / ```pm2 stop all``` / ```pm2 delete all``` / ```pm2 start all``` / ...
- View logs: ```pm2 logs```
- Clearing logs: ```pm2 flush```

## Cleaning database files

Connect to Mongo cli : `mongo` then choose your db with: `show dbs` and `use db_name`
First delete olds files: `db.fs.files.remove({"uploadDate": {$lt : ISODate("2016-11-10T20:32:13.743Z")}});`
Or delete big files: `db.fs.files.remove({"length": {$gt : 3000000}});`  > 3 Mo

then in a mongo shell: 

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



## Contribution

Pull requests or other contributions are welcome

## License

MIT

## Contact

Marius ([@mezphotos](https://twitter.com/mezphotos))
