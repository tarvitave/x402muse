#!/bin/sh
# Initialize the database schema if it doesn't exist
npx prisma db push --skip-generate 2>/dev/null || echo "DB schema already up to date"
# Start the app
exec node server.js
