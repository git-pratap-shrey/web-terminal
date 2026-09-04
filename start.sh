#!/bin/bash

# Default port to 3000 if not set
PORT="${PORT:-3000}"


echo "Starting node server on port ${PORT}..."
exec node server.js
