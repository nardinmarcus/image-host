-- File asset metadata and analytics indexes.
-- New uploads populate size_bytes immediately; legacy records stay explicitly pending
-- until a bounded R2 metadata backfill can inspect them.

ALTER TABLE imginfo ADD COLUMN size_bytes INTEGER;
ALTER TABLE imginfo ADD COLUMN metadata_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE imginfo ADD COLUMN metadata_checked_at TEXT;

CREATE INDEX IF NOT EXISTS idx_imginfo_metadata_status ON imginfo(metadata_status);
CREATE INDEX IF NOT EXISTS idx_tgimglog_time_url ON tgimglog(time, url);

-- Historical rows used a Chinese display format. Canonicalize only the known shape
-- so date-range analytics can use the same ISO8601 comparison as new rows.
UPDATE imginfo
SET time = printf(
  '%s-%02d-%02dT%s+08:00',
  substr(time, 1, 4),
  CAST(substr(time, 6, instr(substr(time, 6), '月') - 1) AS INTEGER),
  CAST(substr(time, instr(time, '月') + 1, instr(substr(time, instr(time, '月') + 1), '日') - 1) AS INTEGER),
  substr(time, instr(time, '日') + 2)
)
WHERE time LIKE '____年%月%日 __:__:__';

UPDATE tgimglog
SET time = printf(
  '%s-%02d-%02dT%s+08:00',
  substr(time, 1, 4),
  CAST(substr(time, 6, instr(substr(time, 6), '月') - 1) AS INTEGER),
  CAST(substr(time, instr(time, '月') + 1, instr(substr(time, instr(time, '月') + 1), '日') - 1) AS INTEGER),
  substr(time, instr(time, '日') + 2)
)
WHERE time LIKE '____年%月%日 __:__:__';
