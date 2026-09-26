-- Комментарии под проектами. Применяется один раз:
--   wrangler d1 execute comments-db --file=./schema.sql

CREATE TABLE IF NOT EXISTS posts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  project    TEXT    NOT NULL,
  name       TEXT    NOT NULL,
  text       TEXT    NOT NULL,
  ip         TEXT,
  hidden     INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS posts_project_created
  ON posts (project, created_at);

-- счётчик для лимита: один ряд на пару (ip, час)
CREATE TABLE IF NOT EXISTS hits (
  ip   TEXT    NOT NULL,
  hour INTEGER NOT NULL,
  PRIMARY KEY (ip, hour)
);

-- чистить раз в сутки (cron в wrangler.toml):
--   DELETE FROM hits WHERE hour < unixepoch()/3600 - 24;
-- спрятать спам, не удаляя:
--   UPDATE posts SET hidden = 1 WHERE id = 42;
