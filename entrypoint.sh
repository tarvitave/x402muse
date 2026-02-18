#!/bin/sh
# Initialize the database schema if it doesn't exist
echo "Running prisma db push..."
node ./node_modules/prisma/build/index.js db push --skip-generate --accept-data-loss 2>&1
echo "Starting server..."
exec node server.js
