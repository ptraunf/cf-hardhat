interface HstsOptions {
    maxAge: number;
    includeSubdomains?: boolean
    preload?: boolean
}
export const getHstsHeaderValue = (opts: HstsOptions) : string => {
    return `max-age=${opts.maxAge}${opts.includeSubdomains ? ', includeSubdomains' : ''}${opts.preload? ', preload' : ''}`
};
export const getStrictTransportSecurityMiddleware = (opts: HstsOptions) : PagesFunction => {
    return async (context) => {
        let res = await context.next();
        res.headers.set('Strict-Transport-Security', getHstsHeaderValue(opts));
        return res;
    }
}