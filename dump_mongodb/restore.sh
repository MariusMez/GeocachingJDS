#!/bin/bash
# Restore from dump
mongorestore --drop --gzip --db "geocaching_jds_prd" ./docker-entrypoint-initdb.d/geocaching_jds_prd