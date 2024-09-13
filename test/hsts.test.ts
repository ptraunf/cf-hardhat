import { describe, it, expect } from 'vitest';
import {createPagesEventContext, waitOnExecutionContext} from "cloudflare:test";
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

import {getHstsHeaderValue, getStrictTransportSecurityMiddleware, ONE_YEAR} from "../src/hsts";

describe('HTTPS Strict Transport Security Middleware', () => {
    it('HSTS options are built into a valid string', () => {
        let hstsValue = getHstsHeaderValue({
            maxAge: 1000000,
            includeSubdomains: true,
            preload: true
        });
        expect(hstsValue.includes('max-age=1000000, includeSubdomains, preload')).toBe(true);
    });
    it('Adds the Strict-Transport-Security Header', async () => {
        const middleware = getStrictTransportSecurityMiddleware();
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
        expect(response.headers.get('strict-transport-security')).toBeTruthy();
        expect(response.headers.get('strict-transport-security')).toStrictEqual(`max-age=${ONE_YEAR}, includeSubdomains`)
    });
});