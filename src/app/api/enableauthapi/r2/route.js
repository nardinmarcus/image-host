export const runtime = 'edge';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { auth } from '@/auth';
import { insertImgInfo } from '@/lib/db';
import { corsHeaders, jsonErr, getClientIp, getReferer, MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from '@/lib/http';
import { normalizeUploadMime, isAllowedR2Mime } from '@/lib/mime';
import { nowTime } from '@/lib/time';

export async function POST(request) {
	// 主存储上传始终要求登录（不依赖 ENABLE_AUTH_API）
	const session = await auth();
	const role = session?.user?.role;
	if (role !== 'admin' && role !== 'user') {
		return jsonErr('unauthorized', 401);
	}

	const { env, cf, ctx } = getRequestContext();

	if (!env.IMGRS) {
		return jsonErr('IMGRS is not Set', 500)
	}

	const req_url = new URL(request.url);

	const clientIp = getClientIp(request);
	const Referer = getReferer(request);

	const formData = await request.formData();
	const file = formData.get('file');
	if (!file) return jsonErr('No file uploaded', 400);
	if (file.size > MAX_UPLOAD_BYTES) return jsonErr(`file too large (max ${MAX_UPLOAD_MB}MB)`, 413);
	const fileType = normalizeUploadMime(file);
	if (!isAllowedR2Mime(fileType)) {
		return jsonErr('invalid file type (image/video/epub)', 400);
	}
	const filename = file.name || 'file';
	const ext = filename.includes('.')
		? filename.split('.').pop()
		: (fileType === 'application/epub+zip' ? 'epub' : 'bin');
	const key = `${crypto.randomUUID()}.${ext}`;

	const header = new Headers()
	header.set("content-type", fileType || 'application/octet-stream')
	header.set("content-length", `${file.size}`)

	try {

		const object = await env.IMGRS.put(key, file, {
			httpMetadata: header
		})

		if (object === null) {
			return jsonErr('object not found', 404)
		}

		const data = {
			"url": `${req_url.origin}/api/rfile/${key}`,
			"code": 200,
			"name": filename
		}

		if (!env.IMG) {
			data.env_img = "null"
			return Response.json({
				...data,
				msg: "1"
			}, {
				status: 200,
				headers: corsHeaders,
			})
		} else {
			const time = await nowTime()
			try {
				const rating_index = await getRating(env, `${req_url.origin}/api/rfile/${key}`);
				await insertImgInfo(env, { url: `/rfile/${key}`, referer: Referer, ip: clientIp, rating: rating_index, time });

				return Response.json({
					...data,
					msg: "2",
					Referer: Referer,
					clientIp: clientIp,
					rating_index: rating_index,
					nowTime: time
				}, {
					status: 200,
					headers: corsHeaders,
				})


			} catch (error) {
				await insertImgInfo(env, { url: `/rfile/${key}`, referer: Referer, ip: clientIp, rating: -1, time });


				return jsonErr('internal error');
			}
		}

	} catch (error) {
		return jsonErr('internal error');
	}

}

async function getRating(env, url) {

	try {
		const apikey = env.ModerateContentApiKey
		const ModerateContentUrl = apikey ? `https://api.moderatecontent.com/moderate/?key=${apikey}&` : ""

		const ratingApi = env.RATINGAPI ? `${env.RATINGAPI}?` : ModerateContentUrl;

		if (ratingApi) {
			const res = await fetch(`${ratingApi}url=${url}`);
			const data = await res.json();
			const rating_index = data.hasOwnProperty('rating_index') ? data.rating_index : -1;

			// return data;
			return rating_index;
		} else {
			return 0
		}


	} catch (error) {
		return error
	}
}
