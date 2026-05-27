#!/bin/sh
set -e

docker rm -f mspl-services 2>/dev/null || true
docker build -t mspl-services .
docker run -d --name mspl-services -p 3000:3000 mspl-services

echo "App is now running at http://localhost:3000"
