DROP TABLE IF EXISTS tgimglog;
CREATE TABLE IF NOT EXISTS tgimglog (
	`id` integer PRIMARY KEY NOT NULL,
    `url` text,
    `referer` text,
	`ip` varchar(255),
	`time` DATE
);
DROP TABLE IF EXISTS imginfo;
CREATE TABLE IF NOT EXISTS imginfo (
	`id` integer PRIMARY KEY NOT NULL,
    `url` text,
    `referer` text,
	`ip` varchar(255),
	`rating` integer,
	`total` integer,
	`time` DATE,
	`mime` text,
	`kind` text
);

-- 已有库迁移（生产 D1 控制台执行一次即可；代码也会尝试 ALTER）：
-- ALTER TABLE imginfo ADD COLUMN mime TEXT;
-- ALTER TABLE imginfo ADD COLUMN kind TEXT;

