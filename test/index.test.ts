import {CspParser} from "csp_evaluator/dist/parser";
import { Directive} from "csp_evaluator/dist/csp"
import {CspOptions, CspDirective, ContentSecurityPolicy} from "../src/index"


test('CSP can build from initial options', () => {
    const cspOpts: CspOptions = {
        basePolicies: {
            'default-src': ["'self'"],
            'font-src': [
                "'self'",
                "https://allowed.font.src.com"
            ],
            'img-src': ["'self'", "data:"],
            'frame-src': [
                "'self'",
                "https://allowed.frame.src.com",
            ],
            'object-src': ["'none'"],
            'base-uri': ["'self'"]
        }
    };

    const csp = new ContentSecurityPolicy(cspOpts);
    expect(csp).toBeTruthy();
});
test('CSP toString produces parseable CSP', () => {
    const cspOpts: CspOptions = {
        basePolicies: {
            'default-src': ["'self'"],
            'font-src': [
                "'self'",
                "https://allowed.font.src.com"
            ],
            'img-src': ["'self'", "data:"],
            'frame-src': [
                "'self'",
                "https://allowed.frame.src.com",
            ],
            'object-src': ["'none'"],
            'base-uri': ["'self'"]
        }
    };
    const csp = new ContentSecurityPolicy(cspOpts);
    const cspString = csp.toString()
    const parsed = new CspParser(cspString).csp
    expect(parsed).toBeTruthy();
});

test('CSP toString includes all the specified policies', () => {
    const expectedCspPolicies = [
        "default-src 'self'",
        "font-src 'self' https://allowed.font.src.com",
        "img-src 'self' data:",
        "frame-src 'self' https://allowed.frame.src.com",
        "object-src 'none'",
        "base-uri 'self'"];
    const cspOpts: CspOptions = {
        basePolicies: {
            'default-src': ["'self'"],
            'font-src': [
                "'self'",
                "https://allowed.font.src.com"
            ],
            'img-src': ["'self'", "data:"],
            'frame-src': [
                "'self'",
                "https://allowed.frame.src.com",
            ],
            'object-src': ["'none'"],
            'base-uri': ["'self'"]
        }
    };
    const csp = new ContentSecurityPolicy(cspOpts);
    const cspString = csp.toString()
    for (const expectedPolicy of expectedCspPolicies) {

        expect(cspString.split(";").map(s => s.trim())).toContain(expectedPolicy);
    }
});

test('useNonce inserts nonce into CSP', () => {
    const cspOpts: CspOptions = {
        basePolicies: {
            'default-src': ["'self'"],
            [CspDirective.fontSrc]: [
                "'self'",
                "https://allowed.font.src.com"
            ],
            [CspDirective.imgSrc]: ["'self'", "data:"],
            'frame-src': [
                "'self'",
                "https://allowed.frame.src.com",
            ],
            'object-src': ["'none'"],
            'base-uri': ["'self'"]
        }
    };
    const csp = new ContentSecurityPolicy(cspOpts);
    const nonce = "abcdefghijklmnop";
    csp.useNonce(CspDirective.scriptSrc, nonce);
    csp.useNonce(CspDirective.styleSrc, nonce);
    const cspString = csp.toString()
    let parsed = new CspParser(cspString).csp
    expect(parsed.policyHasScriptNonces(Directive.SCRIPT_SRC)).toBe(true);
    expect(parsed.policyHasScriptNonces(Directive.STYLE_SRC)).toBe(true);
});

test('useNonce retains initial script-src and style-src policies specified', () => {
    const cspOpts: CspOptions = {
        basePolicies: {
            'default-src': ["'self'"],
            'script-src': ["'strict-dynamic'"],
            'style-src': ["'unsafe-inline'"]
        }
    };

    let csp = new ContentSecurityPolicy(cspOpts);
    const nonce = "abcdefghijklmnop";
    csp.useNonce(CspDirective.scriptSrc, nonce);
    csp.useNonce(CspDirective.styleSrc, nonce);
    const cspString = csp.toString()
    let parsed = new CspParser(cspString).csp
    expect(parsed.policyHasScriptNonces(Directive.SCRIPT_SRC)).toBe(true);
    expect(parsed.directives["script-src"].includes("'strict-dynamic'")).toBe(true);
    expect(parsed.policyHasScriptNonces(Directive.STYLE_SRC)).toBe(true);
    expect(parsed.directives["style-src"].includes("'unsafe-inline'")).toBe(true);
});