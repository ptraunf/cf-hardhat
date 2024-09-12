import {
    waitOnExecutionContext,
    createPagesEventContext, ProvidedEnv
} from 'cloudflare:test';

import {PagesFunction} from "@cloudflare/workers-types";
import {describe, it, expect} from 'vitest';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;
import {getCorsMiddleware} from "../src/cors"

describe('CORS Middleware', () => {
    it('Responds to Preflight requests with 204 and CORS headers', async () => {

        const middleware = getCorsMiddleware();
        const request = new IncomingRequest('http://example.com', {method: "OPTIONS"});
        const mockContext = createPagesEventContext<typeof middleware>({
            request: request,
            params: {},
            data: {},
            next: (req: Request): Response => {
                return new Response("MOCK NEXT BODY", {status: 200});
            }
        });

        const response = await middleware(mockContext);
        waitOnExecutionContext(mockContext);

        expect(response).toBeTruthy();
        expect(response.status).toStrictEqual(204); // 204 NO CONTENT
        expect(response.headers).toBeTruthy();
        expect(response.headers.get('access-control-allow-origin')).toBeTruthy();
        expect(response.headers.get('access-control-allow-origin')).toStrictEqual('sameorigin');

    });
    it('Adds CORS headers to responses', async () => {

        const middleware = getCorsMiddleware();
        const request = new IncomingRequest('http://example.com', {method: "GET"});
        const expectedResponseBody = "MOCK NEXT BODY";
        const mockContext = createPagesEventContext<typeof middleware>({
            request: request,
            params: {},
            data: {},
            next: (req: Request): Response => {
                return new Response(expectedResponseBody, {status: 200});
            }
        });

        const response = await middleware(mockContext);
        waitOnExecutionContext(mockContext);

        expect(response).toBeTruthy();
        expect(response.status).toStrictEqual(200);
        const actualResponseBody = await response.text();
        expect(actualResponseBody).toStrictEqual(expectedResponseBody);
        expect(response.headers).toBeTruthy();
        expect(response.headers.get('access-control-allow-origin')).toBeTruthy();
        expect(response.headers.get('access-control-allow-origin')).toStrictEqual('sameorigin');

    });
})