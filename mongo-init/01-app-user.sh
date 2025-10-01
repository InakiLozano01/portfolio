#!/bin/sh
set -e
mongosh --authenticationDatabase admin -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" <<'JS'
const user = process.env.PORTFOLIO_DB_USER || 'portfolio_user';
const pass = process.env.PORTFOLIO_DB_PASS || 'strong_app_pwd';
db = db.getSiblingDB('portfolio');
db.createUser({ user, pwd: pass, roles: [ { role: 'readWrite', db: 'portfolio' } ] });
JS
