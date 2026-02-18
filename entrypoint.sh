#!/bin/sh
# Initialize the database tables if they don't exist
echo "Initializing database..."
node init-db.js
echo "Starting server..."
exec node server.js
