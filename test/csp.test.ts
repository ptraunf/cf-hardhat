import {CspParser} from "csp_evaluator/dist/parser";
import {Directive} from "csp_evaluator/dist/csp"
import {PagesFunction, ContentOptions, Element} from "@cloudflare/workers-types";
import {
    ContentSecurityPolicy,
    CspDirective,
    CspOptions, getCspFactory, getCspMiddleware, getDefaultNonceDirectives, getDefaultNonceTags,
    getDefaultOptions, getNormalizedOptions,
    InlineStyleNonceHandler, nonceHandlerFactory, Policies,
    ScriptNonceHandler, StylesheetLinkNonceHandler
} from "../src/csp";
import {
    waitOnExecutionContext,
    createPagesEventContext, ProvidedEnv
} from 'cloudflare:test';

import { describe, it, expect } from 'vitest';
import {
    MockElement
} from "./test-utils"


const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;
describe("CspOptions", () => {
    it("Default CSP Policies set object-src 'none'", () => {
        let opts = getDefaultOptions();
        expect(opts.policies["object-src"]).toContain("'none'");
    });
    it("Default CSP Policies include upgrade-insecure-requests", () => {
        let opts = getDefaultOptions();
        expect(opts.policies["upgrade-insecure-requests"]).toBeTruthy();
    });

    it("Omitted nonce directives result in default nonce directives ", () => {
        let opts = getNormalizedOptions({});
        expect(opts.nonceDirectives).toEqual(getDefaultNonceDirectives());
    });

    // it("Omitted nonce tags result in default nonce tags", () => {
    //     let opts = getNormalizedOptions({});
    //     expect(opts.nonceTags).toEqual(getDefaultNonceTags());
    // });

    it("Nonce set to false results in empty nonce tags and directives", () => {
        let opts = {
            ...getDefaultOptions(),
            nonce: false
        }
        let normalizedOpts = getNormalizedOptions(opts);
        expect(normalizedOpts.nonceDirectives).toEqual([]);
        // expect(normalizedOpts.callback).toBe(defaultCallback);
        // expect(normalizedOpts.nonceTags).toEqual([]);
    })
});

describe("ContentSecurityPolicy", () => {
    it('CSP can build from initial options', () => {
        const mockContext = {
            env: {}
        }
        const cspOpts: CspOptions = {
            policies: {
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
        const cspFactory = getCspFactory(cspOpts);
        const csp = cspFactory(mockContext)
        expect(csp).toBeTruthy();
    });
    it('CSP toString produces parseable CSP', () => {
        const mockContext = {
            env: {}
        }
        const cspOpts: CspOptions = {
            policies: {
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
        const csp = getCspFactory(cspOpts)(mockContext);
        const cspString = csp.toString()
        const parsed = new CspParser(cspString).csp
        expect(parsed).toBeTruthy();
    });

    it('CSP toString includes all the specified policies', () => {
        const mockContext = {
            env: {}
        }
        const expectedCspPolicies = [
            "default-src 'self'",
            "font-src 'self' https://allowed.font.src.com",
            "img-src 'self' data:",
            "frame-src 'self' https://allowed.frame.src.com",
            "object-src 'none'",
            "base-uri 'self'"];
        const cspOpts: CspOptions = {
            policies: {
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
        const csp = getCspFactory(cspOpts)(mockContext);
        const cspString = csp.toString()
        for (const expectedPolicy of expectedCspPolicies) {

            expect(cspString.split(";").map(s => s.trim())).toContain(expectedPolicy);
        }
    });

    it('Policies defined as functions are resolved to string values', () => {

        let cspOpts: CspOptions = {
            policies: {
                'base-uri': ["'self'"],
                'default-src': ["'self'"],
                'frame-src': ["'none'"],
                'frame-ancestors': (context) => `${context.env.ALLOWED_FRAME_ANCESTORS}`,
                'object-src': ["'none'"],
                'img-src': ["'self'", "data:"]
            }
        };

        const expectedAllowedFrameAncestors = "expected.allowed.frame.ancestors"
        const mockContext = {env: {ALLOWED_FRAME_ANCESTORS: expectedAllowedFrameAncestors}};
        let csp = getCspFactory(cspOpts)(mockContext);
        expect(csp.getPolicy(CspDirective.frameAncestors).values).toContain(expectedAllowedFrameAncestors);
    });

    it('Falsey directives are omitted', () => {
        const cspOpts: CspOptions = {
            policies: {
                'base-uri': ["'self'"],
                'default-src': ["'self'"],
                'frame-src': ["'none'"],
                'frame-ancestors': false,
                'object-src': ["'none'"],
                'img-src': ["'self'", "data:"]
            }
        };

        const expectedAllowedFrameAncestors = "expected.allowed.frame.ancestors"
        const mockContext = {env: {ALLOWED_FRAME_ANCESTORS: expectedAllowedFrameAncestors}};
        let csp = getCspFactory(cspOpts)(mockContext);
        expect(csp.getPolicy(CspDirective.frameAncestors)).toBeUndefined();
    });
    it('Directives set to true are included', () => {
        const mockContext = {
            env: {}
        }
        const policies: Policies = {
            'upgrade-insecure-requests': true
        };

        let csp = getCspFactory({policies})(mockContext);

        expect(csp.getPolicy(CspDirective.upgradeInsecureRequests)).toBeTruthy();
        expect(csp.getPolicy(CspDirective.upgradeInsecureRequests).values).toEqual([]);
    });
});
describe("Use Nonce", () => {
    it('useNonce inserts nonce into CSP', () => {
        const cspOpts: CspOptions = {
            nonce: {
                directives: [CspDirective.scriptSrc, CspDirective.styleSrc]
            },
            policies: {
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
                'base-uri': ["'self'"],
                'script-src': false,
                'style-src': false
            }
        };

        const csp = getCspFactory(cspOpts)({env: {}});
        const nonce = "abcdefghijklmnop";
        csp.useNonce(nonce);
        const cspString = csp.toString()
        let parsed = new CspParser(cspString).csp
        expect(parsed.policyHasScriptNonces(Directive.SCRIPT_SRC)).toBe(true);
        expect(parsed.policyHasScriptNonces(Directive.STYLE_SRC)).toBe(true);
    });

    it('useNonce retains initial script-src and style-src policies specified', () => {
        const cspOpts: CspOptions = {
            policies: {
                'default-src': ["'self'"],
                'script-src': ["'strict-dynamic'"],
                'style-src': ["'unsafe-inline'"]
            }
        };

        let csp = getCspFactory(cspOpts)({env: {}});
        const nonce = "abcdefghijklmnop";
        csp.useNonce(nonce);
        const cspString = csp.toString()
        console.log(`CSP String: ${cspString}`);
        let parsed = new CspParser(cspString).csp
        expect(parsed.policyHasScriptNonces(Directive.SCRIPT_SRC)).toBe(true);
        expect(parsed.directives["script-src"].includes("'strict-dynamic'")).toBe(true);
        expect(parsed.policyHasScriptNonces(Directive.STYLE_SRC)).toBe(true);
        expect(parsed.directives["style-src"].includes("'unsafe-inline'")).toBe(true);
    });
});


describe("Nonce Handlers", () => {
    it("ScriptNonceHandler sets the nonce attribute", () => {
        const nonce = "NONCE-ABC-123";
        let scriptNonceHandler = new ScriptNonceHandler(nonce);
        let testElement: Element = new MockElement("script");
        scriptNonceHandler.element(testElement);
        expect(testElement.getAttribute("nonce")).toBe(nonce);
    });
    it("InlineStyleNonceHandler sets the nonce attribute", () => {
        const nonce = "NONCE-ABC-123";
        let inlineStyleNonceHandler = new InlineStyleNonceHandler(nonce);
        let testElement: Element = new MockElement("style");

        inlineStyleNonceHandler.element(testElement);
        expect(testElement.getAttribute("nonce")).toBe(nonce);
    });
    it("StylesheetNonceHandler sets the nonce attribute if 'rel' is 'stylesheet'", () => {

        const nonce = "NONCE-ABC-123";
        let stylesheetNonceHandler = new StylesheetLinkNonceHandler(nonce);

        let testElement: Element = new MockElement("style");
        testElement.setAttribute("rel", "stylesheet");

        stylesheetNonceHandler.element(testElement);
        expect(testElement.getAttribute("nonce")).toBe(nonce);
    });

    it("StylesheetNonceHandler does NOT set the nonce attribute if 'rel' is NOT 'stylesheet'", () => {

        const nonce = "NONCE-ABC-123";
        let stylesheetNonceHandler = new StylesheetLinkNonceHandler(nonce);

        let testElement: Element = new MockElement("style");
        testElement.setAttribute("rel", "smilesheet");

        stylesheetNonceHandler.element(testElement);
        expect(testElement.getAttribute("nonce")).toBeUndefined();
    });

    it("nonceHandlerFactory builds and returns the correct handler for 'script' tag", () => {
        const nonce = "NONCE-ABC-123";
        let handler = nonceHandlerFactory("script", nonce)
        expect(handler).toBeInstanceOf(ScriptNonceHandler);
    });
    it("nonceHandlerFactory builds and returns the correct handler for 'style' tag", () => {
        const nonce = "NONCE-ABC-123";
        let handler = nonceHandlerFactory("style", nonce)
        expect(handler).toBeInstanceOf(InlineStyleNonceHandler);
    });
    it("nonceHandlerFactory builds and returns the correct handler for 'style' tag", () => {
        const nonce = "NONCE-ABC-123";
        let handler = nonceHandlerFactory("link", nonce)
        expect(handler).toBeInstanceOf(StylesheetLinkNonceHandler);
    });
})

describe("CSP Middleware Factory", () => {
    it("getCspMiddleware returns a Cloudflare PagesFunction", () => {
        let opts = getDefaultOptions();
        let cspMiddleware = getCspMiddleware(opts);
        expect(typeof cspMiddleware).toEqual("function");
    })
});

describe('CSP Middleware', () => {
    it('adds the Content-Security-Policy header', async () => {
        const request = new IncomingRequest('http://example.com', {method: "GET"});
        const middleware = getCspMiddleware<ProvidedEnv>();
        const mockContext = createPagesEventContext<typeof middleware>({
            request: request,
            params: {},
            data: {},
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
        const middleware = getCspMiddleware<ProvidedEnv>(cspOptions);
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
