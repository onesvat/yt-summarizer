#!/bin/sh
set -e

# Run Prisma migrations to ensure database tables exist
echo "Running Prisma db push to ensure database schema is up to date..."
npx prisma db push --skip-generate
echo "Database schema is ready."

# Start the application
exec node server.js
