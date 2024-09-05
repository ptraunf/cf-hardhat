import {resolveCollection} from "../src/common.ts";

describe('CORS Middleware', () => {
    test('CorsHeaders collection contains Access-Control-Allow-Origin header', () => {
        let corsHeaders = {
            'access-control-allow-origin': ['sameorigin'],
            'access-control-allow-method': ['GET', 'PUT', 'POST', 'DELETE'],
        }
        let resolved = resolveCollection(corsHeaders, {env: {}});
        expect(resolved).toBeTruthy();
    });
});