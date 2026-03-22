#!/bin/sh
echo "Running database initialization..."
npm run init-db

echo "Creating admin user..."
npm run create-admin

echo "Starting server..."
npm run start
