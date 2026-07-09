import { getRequestContext } from '@cloudflare/next-on-pages';
import { auth } from '@/auth';
import {
  countR2MetadataCandidates,
  listR2MetadataCandidates,
  setMediaMetadata,
} from '@/lib/db';
import { jsonOk, jsonErr } from '@/lib/http';
import { nowTime } from '@/lib/time';

export const runtime = 'edge';

// R2 对象头补全以小批次执行，避免一次性扫描阻塞后台或吞掉大量对象操作。
export async function POST() {
  const session = await auth();
  if (session?.user?.role !== 'admin') return jsonErr('forbidden', 403);

  const { env } = getRequestContext();
  if (!env.IMGRS) return jsonErr('IMGRS is not set', 500);

  try {
    const candidates = await listR2MetadataCandidates(env);
    const checkedAt = await nowTime();
    let updated = 0;
    let unavailable = 0;
    let failed = 0;

    for (const candidate of candidates) {
      const key = candidate.url.slice('/rfile/'.length);
      try {
        const object = await env.IMGRS.head(key);
        if (!object) {
          unavailable += 1;
          await setMediaMetadata(env, candidate.url, { status: 'unavailable', checkedAt });
          continue;
        }
        await setMediaMetadata(env, candidate.url, {
          sizeBytes: object.size,
          mime: object.httpMetadata?.contentType || '',
          status: 'partial',
          checkedAt,
        });
        updated += 1;
      } catch (error) {
        console.error('admin/metadata object error:', candidate.url, error);
        failed += 1;
        await setMediaMetadata(env, candidate.url, { status: 'failed', checkedAt });
      }
    }

    const remaining = await countR2MetadataCandidates(env);
    return jsonOk({ data: { processed: candidates.length, updated, unavailable, failed, remaining } });
  } catch (error) {
    console.error('admin/metadata error:', error);
    return jsonErr('internal error');
  }
}
