#!/bin/sh
set -e

# Fix ownership of the mounted data volume (runs as root)
chown -R nextjs:nodejs /app/data

# Run Prisma migrations as nextjs user to ensure database tables exist
echo "Running Prisma db push to ensure database schema is up to date..."
su-exec nextjs node node_modules/prisma/build/index.js db push --skip-generate
echo "Database schema is ready."

# Start the application as nextjs user
exec su-exec nextjs node server.js
