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
- Edit file ``ecosystem.json``` and change settings accordingly to your installation
- Run  ```pm2 start ecosystem.json —watch```

## Monitor

- You can use ```pm2 monit``` / ```pm2 ls``` / ```pm2 stop all``` / ```pm2 delete all``` / ```pm2 start all``` / ...
- View logs: ```pm2 logs```
- Clearing logs: ```pm2 flush```

## Contribution

Pull requests or other contributions are welcome

## License

MIT

## Contact

Marius ([@mezphotos](https://twitter.com/mezphotos))
