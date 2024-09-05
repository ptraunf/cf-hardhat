import {Context, resolveCollection} from "../src/common.ts"
import {CacheControlHeader} from "../src/cache-control.ts";

describe("CacheControl", () => {
    test('resolveDirectives can resolve function arguments to values', () => {
        let
            directives= {
                'max-age': (context: Context) => context.env.MAX_AGE
            };
        let expectedValue = 1234;
        let resolvedDirectives = resolveCollection(directives, {env: {MAX_AGE: expectedValue}});
        expect(resolvedDirectives['max-age']).toEqual(expectedValue);
    })
    test('CacheControlHeader can be resolved to a valid Cache-Control header value', () => {

        let expectedValue = 1234;
        let cacheControlHeader = new CacheControlHeader({'private': true}, {'max-age': expectedValue});
        let s = cacheControlHeader.toString();
        console.log(s);

        expect(s).toBeTruthy();
        expect(s.includes(`max-age=${expectedValue}`)).toBe(true);
        expect(s.includes(`private`)).toBe(true);
    })
});
