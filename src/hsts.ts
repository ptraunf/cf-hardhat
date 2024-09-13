export interface HstsOptions {
    maxAge: number;
    includeSubdomains?: boolean
    preload?: boolean
}
export const getHstsHeaderValue = (opts: HstsOptions) : string => {
    return `max-age=${opts.maxAge}${opts.includeSubdomains ? ', includeSubdomains' : ''}${opts.preload? ', preload' : ''}`
};
export const ONE_YEAR =31536000;
export const getDefaultHstsOptions = () : HstsOptions => {
    return {
        maxAge:  ONE_YEAR,
        includeSubdomains: true
    }
}

export const getStrictTransportSecurityMiddleware = (opts?: HstsOptions) : PagesFunction => {
    if (!opts) {
        opts = getDefaultHstsOptions();
    }
    return async (context) => {
        let res = await context.next();
        res.headers.set('Strict-Transport-Security', getHstsHeaderValue(opts));
        return res;
    }
}