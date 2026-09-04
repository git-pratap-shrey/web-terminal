#!/bin/bash

# Default port to 3000 if not set
PORT="${PORT:-3000}"

# Create nginx configuration for this port
cat <<EOF > nginx.conf
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    location / {
        proxy_pass http://localhost:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }
}
EOF

echo "Copying nginx config and reloading (may require sudo password)..."
sudo cp nginx.conf /etc/nginx/sites-available/default
sudo nginx -s reload

echo "Starting node server on port ${PORT}..."
exec node server.js
