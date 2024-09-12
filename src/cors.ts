import {Context, ResolvableCollection, resolveCollection, ResolvedCollection} from "./common";

export enum AccessControlHeader {
    accessControlAllowOrigin = "access-control-allow-origin",
    accessControlAllowMethods = "access-control-allow-methods",
    accessControlAllowHeaders = "access-control-allow-headers",
    accessControlMaxAge = "access-control-max-age",
}

type CorsHeaders = ResolvableCollection<AccessControlHeader, string[]>
type ResolvedCorsHeaders = ResolvedCollection<AccessControlHeader, string[]>;

export const DEFAULT_MAX_AGE = 86400; // Seconds in 24 hours

export const getDefaultCorsHeaders = (): CorsHeaders => {
    return {
        'access-control-allow-origin': ['sameorigin'],
        'access-control-allow-methods': ['GET, PUT, POST, DELETE'],
        'access-control-max-age': [`${DEFAULT_MAX_AGE}`]
    }
}

export const getCorsMiddleware = (corsHeaders?: CorsHeaders): PagesFunction => {
    if (!corsHeaders) {
        corsHeaders = getDefaultCorsHeaders()
    }
    return async (context) => {
        let resolvedCorsHeaders: ResolvedCorsHeaders = resolveCollection(corsHeaders, context);
        let res;
        if (context.request.method === "OPTIONS") {
            res = new Response(null, {status: 204})
        } else {
            res = await context.next();
        }
        for (let header in resolvedCorsHeaders) {
            res.headers.set(header, resolvedCorsHeaders[header].join(', '));
        }
        return res;
    }
}
