#!/bin/sh
set -e
node /app/docker/entrypoint.mjs
exec "$@"
