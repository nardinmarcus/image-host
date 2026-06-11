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

export default auth(async (req) => {
    const pagesDevRedirect = redirectPagesDevToCustomDomain(req);

    if (pagesDevRedirect) {
        return pagesDevRedirect;
    }

    const { nextUrl } = req;

    // console.log(req?.auth?.user?.role);
    const role = req?.auth?.user?.role;



    const isAuthenticated = !!req.auth;
    const isAPI_ADMIN = nextUrl.pathname.startsWith(API_ADMIN);
    const isADMIN_PAGE = nextUrl.pathname.startsWith(ADMIN_PAGE);

    const isAuthAPI = nextUrl.pathname.startsWith(AUTH_API);

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
        else if (isAuthAPI) {

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

// 使用静态 matcher 配置
export const config = {
    matcher: [
        {
            source: "/:path*",
            has: [
                {
                    type: "header",
                    key: "host",
                    value: "(.+\\.)?img-bnp\\.pages\\.dev"
                }
            ]
        },
        "/admin/:path*",
        "/api/admin/:path*",
        "/api/enableauthapi/:path*"
    ],
};
