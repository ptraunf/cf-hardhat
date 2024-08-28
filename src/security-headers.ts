import {Context} from "./common.js";

export enum SecurityHeaderType {
    accessControlAllowOrigin = "Access-Control-Allow-Origin",
    xFrameOptions = "X-Frame-Options",
    accessControlMaxAge = "Access-Control-Max-Age",
    cacheControl = "Cache-Control",
    pragma = "Pragma",
    expires = "Expires",
    strictTransportSecurity = "Strict-Transport-Security",
    xContentTypeOptions = "X-Content-Type-Options"
}

type HeaderValueFunction = (context: Context) => string;
type HeaderValue = HeaderValueFunction | string | boolean;
type SecurityHeaders = {
    [key in SecurityHeaderType]?: HeaderValue;
}
const ONE_DAY = 24 * 60 * 60;
const ONE_YEAR = 365 * ONE_DAY;

const HSTS_MAX_AGE = ONE_YEAR;
const ACCESS_CONTROL_MAX_AGE = ONE_DAY;

const defaultSecurityHeaders: SecurityHeaders = {
    [SecurityHeaderType.accessControlAllowOrigin]: "'self'",
    [SecurityHeaderType.accessControlMaxAge]: `${ACCESS_CONTROL_MAX_AGE}`,
    [SecurityHeaderType.strictTransportSecurity]: `max-age=${HSTS_MAX_AGE}; includeSubdomains`,
    [SecurityHeaderType.pragma]: 'no-cache',
    [SecurityHeaderType.expires]: '0',
    [SecurityHeaderType.cacheControl]: 'no-cache, no-store, must-revalidate',
    [SecurityHeaderType.xContentTypeOptions]: 'nosniff',
    [SecurityHeaderType.xFrameOptions]: 'DENY'
}

export interface SecurityHeadersOptions {
    headers?: SecurityHeaders
}



export class SecurityHeaderCollection {
    headersFinal: Record<keyof typeof SecurityHeaderType, string>[]

    constructor(private readonly headers: SecurityHeaders, context?: Context) {
        this.headersFinal = []
        for (let h of Object.keys(headers)) {

        }
    }
    [Symbol.iterator]() {
        let i = 0;
        const self = this;
        return {
            next: function(): {value: Record<keyof typeof SecurityHeaderType, string>, done: boolean} {
                if (i < self.headersFinal.length) {
                    return {
                        value: self.headersFinal[i++],
                        done: false
                    }
                } else {
                    return {
                        value: undefined,
                        done: true
                    }
                }
            }
        }
    }

}

export const getSecurityHeadersMiddleware = (opts?: SecurityHeadersOptions) => {

    const setSecurityHeaders: PagesFunction = async (context) => {

        const response = await context.next();

        response.headers.set('Access-Control-Allow-Origin', "'self'");
        response.headers.set("X-Frame-Options", "sameorigin");
        response.headers.set('Access-Control-Max-Age', '86400');
        response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');
        response.headers.set('X-Content-Type-Options', 'nosniff');
        response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubdomains');
        return response;
    }
    return setSecurityHeaders;
}