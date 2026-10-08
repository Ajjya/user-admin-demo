# MongoDB with our setup baked in, so the database is a versioned image that can be pushed to a
# registry and deployed like the app.
FROM mongo:8

# Run once by the official entrypoint, on the first start with an empty /data/db volume.
COPY init/ /docker-entrypoint-initdb.d/

# Healthy only when the real server accepts the app user over the network. During init the image
# runs a temporary mongod that listens on localhost only, so a plain localhost ping would report
# healthy before the app user exists.
HEALTHCHECK --interval=5s --timeout=5s --start-period=30s --retries=10 \
  CMD mongosh --quiet --host "$(hostname)" \
    --username "$MONGO_APP_USERNAME" --password "$MONGO_APP_PASSWORD" \
    --authenticationDatabase "$MONGO_APP_DB" \
    --eval "db.adminCommand('ping').ok" || exit 1
