# CF Hardhat
HTTP security middleware to protect serverless Workers and Functions

## CSP Nonce Middleware
This middleware generates and inserts nonce values into `script`/`style`/`link` tags and `Content-Security-Policy` headers for Cloudflare Pages & Workers. This allows inline scripts to be loaded (more) securely in compliance with a restrictive CSP.

### Usage
! Warning: Please read and understand the caveats below before using cf-hardhat in production. 

```typescript
// In functions/_middleware.ts:
import {CspOptions, getCspMiddleware} from "cf-hardhat/csp";

const cspOpts: CspOptions = {
    policies: {
        'frame-src': [ "'none'" ],
        ...   
    },
};
const nonceMiddleware = getCspMiddleware(cspOpts);

export const onRequest = [..., nonceMiddleware, ...];
```

By default, 

*What's the point?* 

Allowing all inline scripts may be a security risk; however, disallowing all inline scripts can be inconvenient and excessively strict for some threat models. Using nonces (or hashes), a Content Security Policy can allow certain scripts and styles to load, provided they have the right value.

The `script-src` directive of a `Content-Security-Policy` header specifies which scripts may be loaded. If a nonce (a one-time, randomly-generated value) is used:

`Content-Security-Policy`: `script-src 'nonce-{randomBase64Value}' ;`

Then only `script` elements having a `nonce` attribute with the same `randomBase64Value` may load:

```html
<!-- can load: -->
<script nonce="randomBase64Value">
    ...
</script>

<!-- can't load: -->
<script nonce="wrongBase64Value">
    ...
</script>
```

## Caveats
*Isn't it a risk to blindly inject nonces into all script tags?*

Generally, yes. According to [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html):

>Don't create a middleware that replaces all script tags with "script nonce=..." because attacker-injected scripts will then get the nonces as well. You need an actual HTML templating engine to use nonces.

If an attacker's script is injected into an HTML response before it passes through the `cf-hardhat` CSP-nonce middleware (e.g. ), the injected script element would indeed get a valid nonce and be allowed to run by the browser. 

If the recommendation to use an HTML templating engine as suggested by OWASP is not feasible, additional considerations can be taken to mitigate the risk of erroneously inserting a valid nonce into a malicious script.

Exploitation of this behavior is contingent on the malicious script being injected before passing through the middleware. This could happen if a persisted XSS payload is used *unsanitized* to dynamically build a web page. To mitigate this risk, any application accepting untrusted input should **always** validate and/or sanitize input server-side, and any application rendering untrusted content should **always** encode output to ensure it remains *content* and doesn't become *code*.


Applications should apply defense in depth according to a threat model. 

See more at [Mozilla Developer docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src)