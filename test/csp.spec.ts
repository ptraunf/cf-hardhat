import {
    env,
    waitOnExecutionContext,
    SELF,
    createPagesEventContext, ProvidedEnv
} from 'cloudflare:test';

import {PagesFunction } from "@cloudflare/workers-types";
import { describe, it, expect } from 'vitest';
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;
import { getCspMiddleware, CspOptions } from '../src/csp';
describe('CSP Middleware', () => {
    it('adds the Content-Security-Policy header', async () => {
        const request = new IncomingRequest('http://example.com', {method: "GET"});
        const middleware: PagesFunction<ProvidedEnv, any, Record<string, unknown>> = getCspMiddleware<ProvidedEnv>();
        const mockContext = createPagesEventContext<typeof middleware>({
            request: request,
            params: {},
            next: (init) : Response => {
                console.log("mockContext: next")
                return new Response("OK", {status :200});
            }
        } );
        const response = await middleware(mockContext);
        await waitOnExecutionContext(mockContext);
        const actualCsp = response.headers.get("content-security-policy");
        expect(actualCsp).toBeTruthy();
    });
    it('accepts a nonce callback', async () => {
        const request = new IncomingRequest('http://example.com', {method: "GET"});
        const cspOptions : CspOptions = {
            nonce: {
                callback: (nonce: string) => {
                    return async (context) => {
                        return new Response(`${nonce}`, {status :200});
                    }
                }
            }
        };
        const middleware: PagesFunction<ProvidedEnv, any, Record<string, unknown>> = getCspMiddleware<ProvidedEnv>(cspOptions);
        const mockContext = createPagesEventContext<typeof middleware>({
            request: request,
            params: {},
            data: {},
            next: (req: Request) : Response => {
                return new Response("MOCK NEXT BODY", {status :200});
            }
        });
        const response = await middleware(mockContext);
        const actualCsp = response.headers.get("content-security-policy");
        expect(actualCsp).toBeTruthy();
        const noncePattern = /\'nonce\-([a-zA-Z0-9]+)\'/g;
        const matches = actualCsp.matchAll(noncePattern);
        let groups = [...matches].map(m => m[1]);
        let cspNonce: string = groups[1];
        let body = await response.text();
        expect(body.includes(cspNonce)).toBe(true);
    });
});
