import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

async function source(path) {
  return readFile(resolve(root, path), 'utf8');
}

function includesAll(text, values, path) {
  for (const value of values) {
    assert.ok(text.includes(value), `${path} is missing: ${value}`);
  }
}

const [home, panel, queue, links, rfile, cfile, db, migration, upload, apiKeysRoute, adminApiKeys] = await Promise.all([
  source('src/components/HomeClient.jsx'),
  source('src/components/UploadPanel.jsx'),
  source('src/components/UploadQueue.jsx'),
  source('src/components/ResultLinks.jsx'),
  source('src/app/api/rfile/[name]/route.js'),
  source('src/app/api/cfile/[name]/route.js'),
  source('src/lib/db.js'),
  source('migrations/0001_media_indexes.sql'),
  source('src/app/api/enableauthapi/r2/route.js'),
  source('src/app/api/admin/apikeys/route.js'),
  source('src/components/AdminApiKeys.jsx'),
]);

includesAll(home, ['uploadWithProgress', 'runWithConcurrency', 'selectedStorage', 'status: "error"'], 'HomeClient');
includesAll(panel, ['登录后即可上传', '登录后上传'], 'UploadPanel');
includesAll(queue, ['type="button"', '点击、拖拽或粘贴文件到上传队列', '重试'], 'UploadQueue');
includesAll(links, ['navigator.clipboard.writeText', '复制全部', 'Markdown'], 'ResultLinks');

for (const [path, route] of [['rfile', rfile], ['cfile', cfile]]) {
  includesAll(route, ["import { auth }", 'getMediaInfo', 'ctx.waitUntil'], path);
  assert.ok(route.indexOf('getMediaInfo') < route.indexOf('cache.match'), `${path} must check D1 before cache`);
  assert.ok(!route.includes('Referer ==='), `${path} must not authorize by Referer`);
}

assert.ok(!cfile.includes('arrayBuffer('), 'cfile must stream Telegram responses');
assert.ok(!db.includes('ALTER TABLE') && !db.includes('CREATE TABLE'), 'runtime DB layer must not alter schema');
includesAll(migration, [
  'CREATE TABLE IF NOT EXISTS imginfo',
  'CREATE TABLE IF NOT EXISTS tgimglog',
  'CREATE TABLE IF NOT EXISTS api_keys',
  'idx_imginfo_url',
  'idx_imginfo_kind_rating_id',
  'idx_tgimglog_url_id',
], 'migration');
includesAll(upload, ['httpMetadata: { contentType:', "console.error('Failed to store R2 upload'"], 'R2 upload route');
assert.ok(
  !apiKeysRoute.includes('ensureApiKeysTable'),
  'API key route must rely on versioned migrations instead of runtime schema setup',
);
includesAll(adminApiKeys, ['loadFailed', 'API Key 加载失败', '重新加载'], 'AdminApiKeys');

console.log('P0/P1 source contracts verified.');
