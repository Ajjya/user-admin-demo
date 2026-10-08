// Runs in mongosh as the root user, once, when the data volume is empty.
// Creates a least-privilege user for the application: readWrite on its own database only.
const appDb = process.env.MONGO_APP_DB;
const appUser = process.env.MONGO_APP_USERNAME;
const appPassword = process.env.MONGO_APP_PASSWORD;

if (!appDb || !appUser || !appPassword) {
  throw new Error("MONGO_APP_DB, MONGO_APP_USERNAME and MONGO_APP_PASSWORD must be set");
}

db.getSiblingDB(appDb).createUser({
  user: appUser,
  pwd: appPassword,
  roles: [{ role: "readWrite", db: appDb }],
});

print(`Created application user "${appUser}" with readWrite on "${appDb}"`);
