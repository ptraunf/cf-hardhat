import {getHstsHeaderValue} from "../src/hsts";

import {describe, it, expect} from 'vitest';

describe('HTTPS Strict Transport Security Middleware', () => {
    it('HSTS options are built into a valid string', () => {
        let hstsValue = getHstsHeaderValue({
            maxAge: 1000000,
            includeSubdomains: true,
            preload: true
        });
        expect(hstsValue.includes('max-age=1000000, includeSubdomains, preload')).toBe(true);
    });
});