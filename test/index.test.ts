import {CspParser} from "csp_evaluator/dist/parser";
import {Directive} from "csp_evaluator/dist/csp"
import {CspEvaluator} from "csp_evaluator/dist/evaluator";
import {CspOptions, CspDirective, ContentSecurityPolicy} from "../src/index"

(function testCspToString() {
    const cspOpts: CspOptions = {
        basePolicies: {
            defaultSrc: ["'self'"],
            fontSrc: [
                "'self'",
                "https://cdnjs.cloudflare.com"
            ],
            imgSrc: ["'self'", "data:"],
            frameSrc: [
                "'self'",
                "https://challenges.cloudflare.com",
                "https://clickjack-attack.pages.dev"
            ],
            objectSrc: ["'none'"],
            baseUri: ["'self'"]
        }
    };
    const csp = new ContentSecurityPolicy(cspOpts);
    const cspString = csp.toString()
    let parsed = new CspParser(cspString).csp
    const findings = new CspEvaluator(parsed).evaluate();
    console.log(cspString)
    console.log(findings)
})();
(function testCspUseNonce() {
    const cspOpts: CspOptions = {
        basePolicies: {
            defaultSrc: ["'self'"],
            fontSrc: [
                "'self'",
                "https://cdnjs.cloudflare.com"
            ],
            imgSrc: ["'self'", "data:"],
            frameSrc: [
                "'self'",
                "https://challenges.cloudflare.com",
                "https://clickjack-attack.pages.dev"
            ],
            objectSrc: ["'none'"],
            baseUri: ["'self'"]
        }
    };
    const csp = new ContentSecurityPolicy(cspOpts);
    const nonce = "abcdefghijklmnop";
    csp.useNonce(CspDirective.scriptSrc, nonce);
    csp.useNonce(CspDirective.styleSrc, nonce);
    const cspString = csp.toString()
    let parsed = new CspParser(cspString).csp
    if (!parsed.policyHasScriptNonces(Directive.SCRIPT_SRC)) {
        throw Error("Expected script-src to have nonce")
    }
    if (!parsed.policyHasScriptNonces(Directive.STYLE_SRC)) {
        throw Error("Expected style-src to have nonce")
    }
    const findings = new CspEvaluator(parsed).evaluate();
    console.log(cspString)
    console.log(findings)
})();

(function testCspUseNonceWithBasePolicies() {
    const cspOpts: CspOptions = {
        basePolicies: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'strict-dynamic'"],
            styleSrc: ["'unsafe-inline'"],
            fontSrc: [
                "'self'",
                "https://cdnjs.cloudflare.com"
            ],
            imgSrc: ["'self'", "data:"],
            frameSrc: [
                "'self'",
                "https://challenges.cloudflare.com",
                "https://clickjack-attack.pages.dev"
            ],
            objectSrc: ["'none'"],
            baseUri: ["'self'"]
        }
    };
    let csp = new ContentSecurityPolicy(cspOpts);
    const nonce = "abcdefghijklmnop";
    csp.useNonce(CspDirective.scriptSrc, nonce);
    csp.useNonce(CspDirective.styleSrc, nonce);
    const cspString = csp.toString()
    let parsed = new CspParser(cspString).csp
    if (!parsed.policyHasScriptNonces(Directive.SCRIPT_SRC)) {
        throw Error("Expected script-src to have nonce")
    }
    if (!parsed.directives["script-src"].includes("'strict-dynamic'")) {
        throw Error("Expected script-src to retain base policy")
    }
    if (!parsed.policyHasScriptNonces(Directive.STYLE_SRC)) {
        throw Error("Expected style-src to have nonce")
    }
    if (!parsed.directives["style-src"].includes("'unsafe-inline'")) {
        throw Error("Expected style-src to retain base policy")
    }
    const findings = new CspEvaluator(parsed).evaluate();
    console.log(cspString)
    console.log(findings)
})();