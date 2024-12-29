import {
    ResolvableCollection,
    resolveCollection,
    ResolvedCollection
} from "./common";

enum CacheControlDirective {
    maxAge = 'max-age',
    sMaxage = 's-maxage',
    staleWhileRevalidate = 'stale-while-revalidate',
    staleIfError = "stale-if-error",
}

// Flags are directives with no arguments
enum CacheControlFlag {
    noCache = 'no-cache',
    noStore = "no-store",
    noTransform = "no-transform",
    proxyRevalidate = "proxy-revalidate",
    private = "private",
    mustUnderstand = "must-understand",
    immutable = "immutable"
}

export type CacheControlDirectives = ResolvableCollection<CacheControlDirective, number>;
type ResolvedCacheControlDirectives = ResolvedCollection<CacheControlDirective, number>;
export type CacheControlFlags = ResolvableCollection<CacheControlFlag, boolean>;
type ResolvedCacheControlFlags = ResolvedCollection<CacheControlFlag, boolean>;


export interface CacheControlOptions {
    directives?: CacheControlDirectives,
    flags?: CacheControlFlags
}
export class CacheControlHeader {
   constructor(private readonly flags: ResolvedCacheControlFlags, private readonly directives: ResolvedCacheControlDirectives) {
   }
   toString(): string {
       const flags = Object.keys(this.flags).filter((k) => this.flags[k]);
       const directivesWithArgs = Object.keys(this.directives).map((k) => {return `${k}=${this.directives[k]}`});
       return `${[...flags, ...directivesWithArgs].join(", ")}`;
   }
}
export const getDefaultCacheControlOptions = (): CacheControlOptions => {
    return {
        flags: {
            'private': true,
            'no-cache': true,
            'no-store': true
        },
        directives: {
            'max-age': 0
        },
    }
}
export const getCacheControlMiddleware = (cacheControlOptions?: CacheControlOptions): PagesFunction => {
    if (!cacheControlOptions) {
        cacheControlOptions = getDefaultCacheControlOptions();
    }
    return async (context) => {
        let resolvedDirectives : ResolvedCacheControlDirectives = resolveCollection(cacheControlOptions.directives, context);
        let resolvedFlags = resolveCollection(cacheControlOptions.flags, context);
        let cacheControlHeader = new CacheControlHeader(resolvedFlags, resolvedDirectives)
        let res = await context.next();
        res.headers.set("Cache-Control", cacheControlHeader.toString());
        return res;
    }
}