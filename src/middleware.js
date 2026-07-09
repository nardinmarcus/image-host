import { auth } from "@/auth"


const PAGES_DEV_HOST = "img-bnp.pages.dev";
const CUSTOM_DOMAIN_ORIGIN = "https://image.namooca.com";
const ROOT = '/';
const PUBLIC_ROUTES = ['/'];
const DEFAULT_REDIRECT = '/login';
const LOGIN = '/login'
const API_ADMIN = "/api/admin"
const ADMIN_PAGE = "/admin"
const AUTH_API = "/api/enableauthapi"
// isauth 允许匿名探测登录态；r2/tgchannel 主存储上传始终要登录
const AUTH_STATUS = "/api/enableauthapi/isauth"
const AUTH_UPLOAD_PREFIXES = [
    "/api/enableauthapi/r2",
    "/api/enableauthapi/tgchannel",
];
const enableAuthapi = process.env.ENABLE_AUTH_API === 'true';

function isPagesDevHost(hostname) {
    return hostname === PAGES_DEV_HOST || hostname.endsWith(`.${PAGES_DEV_HOST}`);
}

function redirectPagesDevToCustomDomain(req) {
    const { nextUrl } = req;

    if (!isPagesDevHost(nextUrl.hostname)) {
        return null;
    }

    const targetUrl = new URL(nextUrl.pathname + nextUrl.search, CUSTOM_DOMAIN_ORIGIN);

    return Response.redirect(targetUrl, 301);
}

function isAuthStatusPath(pathname) {
    return pathname === AUTH_STATUS || pathname.startsWith(`${AUTH_STATUS}/`);
}

function isUploadAuthPath(pathname) {
    return AUTH_UPLOAD_PREFIXES.some(
        (p) => pathname === p || pathname.startsWith(`${p}/`)
    );
}

const protectedRoutesMiddleware = auth(async (req) => {
    const { nextUrl } = req;

    // console.log(req?.auth?.user?.role);
    const role = req?.auth?.user?.role;



    const isAuthenticated = !!req.auth;
    const isAPI_ADMIN = nextUrl.pathname.startsWith(API_ADMIN);
    const isADMIN_PAGE = nextUrl.pathname.startsWith(ADMIN_PAGE);

    const isAuthAPI = nextUrl.pathname.startsWith(AUTH_API);
    const isUploadAPI = isUploadAuthPath(nextUrl.pathname);
    const isStatusAPI = isAuthStatusPath(nextUrl.pathname);

    if (!isAuthenticated) {
        if (isAPI_ADMIN) {
            return Response.json(
                { status: "fail", message: "You are not logged in by admin !", success: false },
                { status: 401 },
            )
        }
        else if (isADMIN_PAGE) {
            return Response.redirect(new URL(LOGIN, nextUrl));
        }
        // 主存储上传：始终要求登录（与 ENABLE_AUTH_API 无关）
        else if (isUploadAPI) {
            return Response.json(
                { status: "fail", message: "You are not logged in by user !", success: false },
                { status: 401 }
            );
        }
        else if (isAuthAPI && !isStatusAPI) {
            // 其余 enableauthapi（如 ip）：仍由 ENABLE_AUTH_API 开关控制
            if (enableAuthapi) {
                return Response.json(
                    { status: "fail", message: "You are not logged in by user !", success: false },
                    { status: 401 }
                );
            }
            else {
                return
            }
        }

        else {
            return

        }
    }

    if (role === 'admin') {
        return;
    }

    if (role === 'user') {
        if (isAPI_ADMIN || isADMIN_PAGE) {
            return Response.redirect(new URL(LOGIN, nextUrl));

        }
    }

})

export default function middleware(req, event) {
    const pagesDevRedirect = redirectPagesDevToCustomDomain(req);

    if (pagesDevRedirect) {
        return pagesDevRedirect;
    }

    return protectedRoutesMiddleware(req, event);
}

// 使用静态 matcher 配置
export const config = {
    matcher: [
        {
            source: "/:path*",
            has: [
                {
                    type: "header",
                    key: "host",
                    value: "img-bnp\\.pages\\.dev"
                }
            ]
        },
        {
            source: "/:path*",
            has: [
                {
                    type: "header",
                    key: "host",
                    value: "(?<subdomain>.+)\\.img-bnp\\.pages\\.dev"
                }
            ]
        },
        "/admin/:path*",
        "/api/admin/:path*",
        "/api/enableauthapi/:path*"
    ],
};
