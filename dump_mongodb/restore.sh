#!/bin/bash
# Restore from dump
mongorestore --username user --password password --drop --gzip --db "geocaching_jds_prd" ./docker-entrypoint-initdb.d/geocaching_jds_prd