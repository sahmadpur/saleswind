#!/usr/bin/env bash
# Generate a self-signed TLS cert for Postgres and set the ownership/perms
# the official postgres image requires (runs as uid 999).
set -euo pipefail
cd "$(dirname "$0")"

mkdir -p certs
openssl req -new -x509 -days 3650 -nodes \
  -out certs/server.crt -keyout certs/server.key \
  -subj "/CN=saleswind-db"

# Postgres refuses to start if the key is group/world readable, and the file
# must be owned by the db user (uid 999 in the official image).
chmod 600 certs/server.key
chmod 644 certs/server.crt
sudo chown 999:999 certs/server.key certs/server.crt

echo "✓ Cert written to ./certs (server.crt, server.key)"
