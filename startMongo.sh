#!/bin/bash

echo "Killing previous instance of MongoDB..."
pkill -f mongod
echo "Starting MongoDB..."
mongod -f /usr/local/etc/mongod.conf --fork
