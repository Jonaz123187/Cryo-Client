CREATE TABLE IF NOT EXISTS challenges (
 id TEXT PRIMARY KEY, uuid TEXT NOT NULL, username TEXT NOT NULL,
 server_hash TEXT NOT NULL, expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS challenges_expiry ON challenges(expires);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY, uuid TEXT NOT NULL, expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires);
CREATE TABLE IF NOT EXISTS profiles (
 uuid TEXT PRIMARY KEY, profile TEXT NOT NULL, seen INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS limits (
 bucket TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS banner_assets (
 owner TEXT PRIMARY KEY, hash TEXT NOT NULL, data BLOB NOT NULL
);
-- Optional usage only. HMAC keys cannot be converted back to UUIDs without the server secret.
CREATE TABLE IF NOT EXISTS usage_users (
 user_key TEXT PRIMARY KEY, first_seen INTEGER NOT NULL, last_seen INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS usage_daily (
 day TEXT NOT NULL, user_key TEXT NOT NULL, kind TEXT NOT NULL,
 version TEXT NOT NULL, last_seen INTEGER NOT NULL,
 PRIMARY KEY(day,user_key,kind)
);
CREATE TABLE IF NOT EXISTS registered_users (user_key TEXT PRIMARY KEY, first_seen INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS statistics_peak (id INTEGER PRIMARY KEY CHECK(id=1), peak INTEGER NOT NULL DEFAULT 0, sampled INTEGER NOT NULL DEFAULT 0);
INSERT OR IGNORE INTO statistics_peak(id,peak,sampled) VALUES(1,0,0);
CREATE INDEX IF NOT EXISTS profiles_seen ON profiles(seen);
