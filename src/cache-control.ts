import { PagesFunction } from "@cloudflare/workers-types"
import {Context} from "./common.js";

type CacheControlDirectives =
    'no-cache' |
    'no-store' |
    'must-revalidate' |
    's-maxage' |
    'no-transform' |
    'proxy-revalidate' |
    'private' |
    'public' |
    'must-understand' |
    'immutable' |
    'stale-while-revalidate' |
    'stale-if-error'
    ;

enum CacheControlDirective {
    noCache = 'no-cache',
    maxAge = 'max-age',
    mustRevalidate = 'mustRevalidate',
}

enum CacheControlHeader {
    pragma = "pragma",
    cacheControl = "cache-control",
    clearSiteData = "clear-site-data",
    expires = "expires",
}
type RequestPredicate = (request: Request) => boolean;

type CacheControlOption = {
    [key in CacheControlDirective]: number | boolean;
}
type CacheControlOptions = {
    maxAge?: number;
    noStore?: boolean;
    noCache?: boolean;
    mustRevalidate?: boolean;
    sMaxage?: number;
    noTransform?: boolean;
    proxyRevalidate: boolean;
    private : boolean;
    mustUnderstand: boolean;
    immutable: boolean;
    staleWhileRevalidate: number;
    staleIfError: number;
}
const cacheControl = (cacheControlOptions: CacheControlOptions) : PagesFunction => {
    return async (context) => {
        let res = context.next();

        return res;
    }
}