-- Runtime handlers never change schema. This migration safely bootstraps a
-- fresh D1 database and adds indexes to already-initialized production tables.

CREATE TABLE IF NOT EXISTS tgimglog (
  id INTEGER PRIMARY KEY NOT NULL,
  url TEXT,
  referer TEXT,
  ip VARCHAR(255),
  time DATE
);

CREATE TABLE IF NOT EXISTS imginfo (
  id INTEGER PRIMARY KEY NOT NULL,
  url TEXT,
  referer TEXT,
  ip VARCHAR(255),
  rating INTEGER,
  total INTEGER,
  time DATE,
  mime TEXT,
  kind TEXT
);

CREATE TABLE IF NOT EXISTS api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT,
  last_used_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_imginfo_url ON imginfo(url);
CREATE INDEX IF NOT EXISTS idx_imginfo_kind_rating_id ON imginfo(kind, rating, id DESC);
CREATE INDEX IF NOT EXISTS idx_tgimglog_url_id ON tgimglog(url, id DESC);
CREATE INDEX IF NOT EXISTS idx_tgimglog_ip ON tgimglog(ip);
CREATE INDEX IF NOT EXISTS idx_tgimglog_referer ON tgimglog(referer);
