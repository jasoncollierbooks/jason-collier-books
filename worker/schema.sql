-- Collier Entertainment sign-in D1 schema (collier-users)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  member INTEGER NOT NULL DEFAULT 1,
  updates INTEGER NOT NULL DEFAULT 0,
  updates_at TEXT,
  unsub_token TEXT UNIQUE,
  created TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  expires INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS magic_links (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  ip_hash TEXT,
  return_to TEXT,
  created INTEGER NOT NULL,
  expires INTEGER NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  updates INTEGER NOT NULL DEFAULT 0,
  code_hash TEXT,
  code_tries INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS likes (
  item TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  created INTEGER NOT NULL,
  PRIMARY KEY (item, user_id)
);

CREATE TABLE IF NOT EXISTS ratings (
  item TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  stars INTEGER NOT NULL,
  updated INTEGER NOT NULL,
  PRIMARY KEY (item, user_id)
);

CREATE INDEX IF NOT EXISTS idx_magic_links_email ON magic_links(email);
CREATE INDEX IF NOT EXISTS idx_magic_links_ip ON magic_links(ip_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires);
CREATE INDEX IF NOT EXISTS idx_likes_item ON likes(item);
CREATE INDEX IF NOT EXISTS idx_ratings_item ON ratings(item);
