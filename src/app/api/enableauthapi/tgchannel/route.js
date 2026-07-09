export const runtime = 'edge';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { auth } from '@/auth';
import { insertImgInfo } from '@/lib/db';
import { corsHeaders, jsonErr, getClientIp, getReferer, MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from '@/lib/http';
import { normalizeUploadMime, isAllowedTgMime, isTgDocumentMime } from '@/lib/mime';
import { nowTime } from '@/lib/time';

export async function POST(request) {
	// 主存储上传始终要求登录（不依赖 ENABLE_AUTH_API）
	const session = await auth();
	const role = session?.user?.role;
	if (role !== 'admin' && role !== 'user') {
		return jsonErr('unauthorized', 401);
	}

	const { env, cf, ctx } = getRequestContext();

	if (!env.TG_BOT_TOKEN || !env.TG_CHAT_ID) {
		return jsonErr('TG_BOT_TOKEN or TG_CHAT_ID is not Set', 500)
	}

	const clientIp = getClientIp(request);
	const Referer = getReferer(request);

	const formData = await request.formData();
	const file = formData.get('file');
	if (!file) return jsonErr('No file uploaded', 400);
	if (file.size > MAX_UPLOAD_BYTES) return jsonErr(`file too large (max ${MAX_UPLOAD_MB}MB)`, 413);

	const fileType = normalizeUploadMime(file);
	if (!isAllowedTgMime(fileType)) {
		return jsonErr('invalid file type (image/video/audio/pdf/epub/doc/xls/ppt)', 400);
	}

	const req_url = new URL(request.url);

	let endpoint;
	let fileTypevalue;
	if (fileType.startsWith('image/')) {
		endpoint = 'sendPhoto';
		fileTypevalue = 'photo';
	} else if (fileType.startsWith('video/')) {
		endpoint = 'sendVideo';
		fileTypevalue = 'video';
	} else if (fileType.startsWith('audio/')) {
		endpoint = 'sendAudio';
		fileTypevalue = 'audio';
	} else if (isTgDocumentMime(fileType)) {
		endpoint = 'sendDocument';
		fileTypevalue = 'document';
	} else {
		return jsonErr('invalid file type (image/video/audio/pdf/epub/doc/xls/ppt)', 400);
	}


	const up_url = `https://api.telegram.org/bot${env.TG_BOT_TOKEN}/${endpoint}`;
	let newformData = new FormData();
	newformData.append("chat_id", env.TG_CHAT_ID);
	newformData.append(fileTypevalue, formData.get('file'));

	try {
		const res_img = await fetch(up_url, {
			method: "POST",
			headers: {
				"User-Agent": " Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0"
			},
			body: newformData,
		});


		let responseData = await res_img.json();
		const fileData = await getFile(responseData);
		if (!fileData?.file_id) {
			return jsonErr('telegram upload failed', 502);
		}

		const data = {
			"url": `${req_url.origin}/api/cfile/${fileData.file_id}`,
			"code": 200,
			"name": fileData.file_name
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
				const rating_index = await getRating(env, `${fileData.file_id}`);
				await insertImgInfo(env, { url: `/cfile/${fileData.file_id}`, referer: Referer, ip: clientIp, rating: rating_index, time });

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
				await insertImgInfo(env, { url: `/cfile/${fileData.file_id}`, referer: Referer, ip: clientIp, rating: -1, time });


				return jsonErr('internal error');
			}
		}

	} catch (error) {
		return jsonErr('internal error');
	}

}

async function getFile_path(env, file_id) {
	try {
		const url = `https://api.telegram.org/bot${env.TG_BOT_TOKEN}/getFile?file_id=${file_id}`;
		const res = await fetch(url, {
			method: 'GET',
			headers: {
				"User-Agent": " Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome"
			},
		})

		let responseData = await res.json();

		if (responseData.ok) {
			const file_path = responseData.result.file_path
			return file_path
		} else {
			return "error";
		}
	} catch (error) {
		return "error";

	}
}

const getFile = async (response) => {
	try {
		if (!response.ok) {
			return null;
		}

		const getFileDetails = (file) => ({
			file_id: file.file_id,
			file_name: file.file_name || file.file_unique_id
		});

		if (response.result.photo) {
			const largestPhoto = response.result.photo.reduce((prev, current) =>
				(prev.file_size > current.file_size) ? prev : current
			);
			return getFileDetails(largestPhoto);
		}

		if (response.result.video) {
			return getFileDetails(response.result.video);
		}

		// sendAudio / sendVoice
		if (response.result.audio) {
			return getFileDetails(response.result.audio);
		}
		if (response.result.voice) {
			return getFileDetails(response.result.voice);
		}

		if (response.result.document) {
			return getFileDetails(response.result.document);
		}

		return null;
	} catch (error) {
		console.error('Error getting file id:', error.message);
		return null;
	}
};


async function getRating(env, url) {

	try {
		const file_path = await getFile_path(env, url);

		const apikey = env.ModerateContentApiKey
		const ModerateContentUrl = apikey ? `https://api.moderatecontent.com/moderate/?key=${apikey}&` : ""

		const ratingApi = env.RATINGAPI ? `${env.RATINGAPI}?` : ModerateContentUrl;

		if (ratingApi) {
			const res = await fetch(`${ratingApi}url=https://api.telegram.org/file/bot${env.TG_BOT_TOKEN}/${file_path}`);
			const data = await res.json();
			const rating_index = data.hasOwnProperty('rating_index') ? data.rating_index : -1;

			return rating_index;
		} else {
			return 0
		}


	} catch (error) {
		return -1
	}
}
