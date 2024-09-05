import {PagesFunction} from "@cloudflare/workers-types"
import {Context, FunctionOrValue} from "./common.js";


// export type CacheControlArgValue = number | ((context: Context) => number);

export type CacheControlArgValue = FunctionOrValue<number>;
export type CacheControlFlagValue = FunctionOrValue<boolean>;

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

type ResolvableCollection<K extends string, V >  = {
    [key in K]?: FunctionOrValue<V>;
}
type ResolvedCollection<K extends string, V> = {
    [key in K]?: V
}


function resolveFunctionOrValue<V>(f: FunctionOrValue<V>, context: Context): V {
    if (typeof f === 'function') {
        return (f as Function)(context);
    } else if (!!f) {
        return f as V;
    } else {
        return undefined;
    }
}
export function resolveFunctionOrValues<E extends string, V>(unresolved: ResolvableCollection<E, V>, context: Context) : ResolvedCollection<E, V>{
    let resolved : ResolvedCollection<E, V> = {};
    for (const key in unresolved) {
        if (typeof unresolved[key] === 'function') {
            resolved[key] = unresolved[key](context);
        } else if (!!unresolved[key]) {
            resolved[key] = unresolved[key] as V;
        }
    }
    return resolved;
}
// type CacheControlDirectives = {
//     [key in CacheControlDirective]?: FunctionOrValue<number>;
// };
type CacheControlDirectives = ResolvableCollection<CacheControlDirective, number>
type ResolvedCacheControlDirectives = ResolvedCollection<CacheControlDirective, number>
// type ResolvedCacheControlDirectives = {
//     [key in CacheControlDirective]?: number;
// }
export type CacheControlFlags = {
    [key in CacheControlFlag]?: CacheControlFlagValue;
}
type ResolvedCacheControlFlags = ResolvedCollection<CacheControlFlag, boolean>;


export interface CacheControlOptions {
    directives: CacheControlDirectives,
    flags: CacheControlFlags
}
export class CacheControlHeader {
   constructor(private readonly flags: ResolvedCacheControlFlags, private readonly directives: ResolvedCacheControlDirectives) {
   }
   toString(): string {
       const flags = Object.keys(this.flags).filter((k) => this.flags[k]).join(', ');
       const directivesWithArgs = Object.keys(this.directives).map((k) => `${k}=${this.directives[k]}`).join(', ');
       return `${[flags, directivesWithArgs].join(", ")}`;
   }
}

export const resolveDirectives  = (directives: CacheControlDirectives, context: Context): ResolvedCacheControlDirectives => {
    let resolved : ResolvedCacheControlDirectives = {}
    for (const directive in directives) {
        if (typeof directives[directive] === "function") {
            resolved[directive] = directives[directive](context);
        } else if (typeof directives[directive] === "number") {
            resolved[directive] = directives[directive];
        }
    }
    return resolved;
}

export const getCacheControlMiddleware = (cacheControlOptions: CacheControlOptions): PagesFunction => {
    // validate opts
    return async (context) => {
        let resolvedDirectives = resolveFunctionOrValues(cacheControlOptions.directives, context);
        let resolvedFlags = resolveFunctionOrValues(cacheControlOptions.flags, context);
        let cacheControlHeader = new CacheControlHeader(resolvedFlags, resolvedDirectives)
        let res = await context.next();
        res.headers.set("Cache-Control", cacheControlHeader.toString());
        return res;
    }
}