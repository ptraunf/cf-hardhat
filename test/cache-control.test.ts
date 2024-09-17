import {createPagesEventContext, waitOnExecutionContext} from "cloudflare:test";

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;
import {Context, resolveCollection} from "../src/common"
import {CacheControlHeader, getCacheControlMiddleware} from "../src/cache-control";

import {describe, it, expect} from 'vitest';

describe("CacheControl", () => {
    it('resolveDirectives can resolve function arguments to values', () => {
        let
            directives = {
                'max-age': (context: Context) => context.env.MAX_AGE
            };
        let expectedValue = 1234;
        let resolvedDirectives = resolveCollection(directives, {env: {MAX_AGE: expectedValue}});
        expect(resolvedDirectives['max-age']).toEqual(expectedValue);
    })
    it('CacheControlHeader can be resolved to a valid Cache-Control header value', () => {

        let expectedValue = 1234;
        let cacheControlHeader = new CacheControlHeader({'private': true}, {'max-age': expectedValue});
        let s = cacheControlHeader.toString();
        console.log(s);

        expect(s).toBeTruthy();
        expect(s.includes(`max-age=${expectedValue}`)).toBe(true);
        expect(s.includes(`private`)).toBe(true);
    });

    it('Uses default Cache-Control options if none are provided', async () => {
        let middleware = getCacheControlMiddleware();
        const request = new IncomingRequest('http://example.com', {method: "GET"});
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
        expect(response.headers).toBeTruthy();
        expect(response.headers.get('cache-control')).toBeTruthy();
        expect(response.headers.get('cache-control')).toStrictEqual('private, no-cache, no-store, max-age=0');
    });

    it('Adds the cache-control header', async () => {
        let middleware = getCacheControlMiddleware({
            flags: {
                "no-transform": true,
                "private": true
            }
        });
        const request = new IncomingRequest('http://example.com', {method: "GET"});
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
        expect(response.headers).toBeTruthy();
        expect(response.headers.get('cache-control')).toBeTruthy();
        expect(response.headers.get('cache-control')).toStrictEqual('no-transform, private');
    });
});
