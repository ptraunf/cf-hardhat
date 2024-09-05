import {Context, ResolvableCollection, resolveCollection, ResolvedCollection} from "./common";

export enum AccessControlHeader {
    accessControlAllowOrigin = "access-control-allow-origin",
    accessControlAllowMethods = "access-control-allow-methods",
    accessControlAllowHeaders = "access-control-allow-headers",
    accessControlMaxAge = "access-control-max-age",
}

type CorsHeaders = ResolvableCollection<AccessControlHeader, string[]>
type ResolvedCorsHeaders = ResolvedCollection<AccessControlHeader, string[]>;


export const getCorsMiddleware = (corsHeaders: CorsHeaders): PagesFunction => {
    return async (context) => {
        let resolved : ResolvedCorsHeaders = resolveCollection(corsHeaders, context);
        let res = await context.next();
        for (let header in resolved) {
            res.headers.set(header, resolved[header].join(', '));
        }
        return res;
    }
}
