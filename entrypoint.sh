#!/bin/sh
# Initialize the database schema if it doesn't exist
echo "Running prisma db push..."
npx prisma db push --skip-generate --accept-data-loss 2>&1 || echo "WARNING: prisma db push failed"
echo "Starting server..."
# Start the app
exec node server.js
