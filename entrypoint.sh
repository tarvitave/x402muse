#!/bin/sh
# Initialize the database tables if they don't exist
echo "Initializing database..."
node init-db.js
echo "Starting server..."

# Use exec so Node receives SIGTERM directly from Docker for graceful shutdown
exec node server.js
