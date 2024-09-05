
import {SecurityHeaderType, SecurityHeadersOptions, SecurityHeaderCollection} from '../src/security-headers';

test('Options override default security headers', () => {
    const opts : SecurityHeadersOptions = {
        headers: {
            'Access-Control-Allow-Origin': "sameorigin",
            'X-Frame-Options': false,
        }
    }
    const secHeaderCollection = new SecurityHeaderCollection(opts.headers);
    for (const h of secHeaderCollection) {
        console.log(h);
        expect(h).toBeTruthy();
    }
});