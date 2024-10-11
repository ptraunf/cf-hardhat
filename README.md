# CF Hardhat

`cf-hardhat` provides middlewares that protect serverless Workers and Pages on Cloudflare by adding security headers to HTTP responses.

## Modules
- Content Security Policy (CSP) middleware (`cf-hardhat/csp`)
- Cross-Origin Resource Sharing (CORS) Access-Control Middleware (`cf-hardhat/cors`)
- HTTP Strict Transport Security (HSTS) middleware (`cf-hardhat/hsts`)

## Installation
```shell
npm install --save-dev cf-hardhat
```

## Basic Usage

```typescript
import {getCspMiddleware} from "cf-hardhat/csp";
import {getCorsMiddleware} from "cf-hardhat/cors";
import {getHstsMiddleware} from "cf-hardhat/hsts";

export const onRequest = [
    // Each returns a PagesFunction
    getCspMiddleware(),
    getCorsMiddleware(),
    getHstsMiddleware()
];
```

## Content-Security-Policy Middleware
The factory function `getCspMiddleware` returns a `PagesFunction` that generates a Content-Security-Policy header and adds it to the response. 

### Features:
- Use nonces in`script-src` and `style-src` directives
- Specify how nonces are inserted into your pages, or automatically inject them
- Define directives that depend on environment variables

### Usage
The `CspOptions` include `policies` configuration. Policies may be defined as an array of strings, or as a function that resolves to a string, given a context with `env`.

```typescript
// In functions/_middleware.ts:
import {getCspMiddleware} from "cf-hardhat/csp";

// Using the default options
const cspMiddleware = getCspMiddleware();

// Populate directives from Environment variables
let cspOpts: CspOptions = {
    policies: {
        ... 
        'frame-src': ["'self'", "https:"],
        'frame-ancestors': (context) => `${context.env.ALLOWED_FRAME_ANCESTORS}`,
        ... 
    }
};
const cspMiddleware = getCspMiddleware(cspOpts);

export const onRequest = [
    // ... other PagesFunctions
    cspMiddleware
];

```
### Nonce Callback
If using nonces, a function can be passed and called with the nonce to return a `PagesFunction` that injects the nonce into the page. 

If specifying a callback to inject the nonce, one should use a templating engine (like [mustache](https://www.npmjs.com/package/mustache) or [ejs](https://www.npmjs.com/package/ejs)) and add placeholders to HTML templates:
```html
<script type="text/javascript" src="trusted.js" nonce="{{nonce}}"></script>
<link rel="stylesheet" href="style.css" nonce="{{nonce}}"/>
```

For example, 

```typescript
// In functions/_middleware.ts:
import {CspOptions, getCspMiddleware} from "cf-hardhat/csp";
import Mustache from "mustache";

const cspOpts: CspOptions = {
    policies: {...},
    nonce: { 
        // Specify which CSP directives should declare a nonce
        directives: ['script-src'], // default: script-src, style-src

        // Specify how nonces are injected:
        callback: (nonce: string) => {
            return async (context) => {
                let response = await context.next();
                let contentType = response.headers.get("content-type");
                if (contentType?.startsWith("text/html")) {
                    let template = await response.text();
                    // Insert via HTML templating engine, such as mustache
                    let rendered = Mustache.render(template, {
                        nonce: nonce
                    });
                    return new Response(rendered, {
                        status: 200,
                        headers: {
                            ...response.headers.entries(),
                        }
                    });
                } else {
                    return response;
                }
            }
        }
    }
};
```
If a page includes dynamically-rendered content, using a templating engine provides the benefits:
 - Templating allows one to insert the nonce before or at the same time as rendering dynamic content. This prevents nonces from being inserted into XSS payloads that result from rendering the content. (E.g. if content includes `<script nonce="{{nonce}}">`)
 - Output is safely encoded for HTML by default, mitigating persisted XSS attacks. (E.g. `<script>` is rendered as `&lt;script&gt;`)

If that seems overly complicated, there's good news! A more convenient alternative exists: `autoInjectTags`.

### Automatically Inject Nonces 
`autoInjectTags` can be defined to automatically insert nonces into all specified tags present in the page. 
```typescript
{
...
    nonce: {
        autoInjectTags: ["script", "link", "style"]
    }
}
```
For static web pages, this option may not be any less secure than defining a nonce callback. See [Caveats](#Caveats) below, as well as this [CSP Demo](https://csp-demo-app.pages.dev), which demonstrates the effects of automatically injecting nonces ("MODERATE" mode) versus defining a nonce callback using a templating engine ("STRICT" mode).

### *What's the point of all this nonce sense?* 

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
### Caveats
*Isn't it a risk to automatically inject nonces into all script tags?*

Generally, yes. According to [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html):

>Don't create a middleware that replaces all script tags with "script nonce=..." because attacker-injected scripts will then get the nonces as well. You need an actual HTML templating engine to use nonces.

If an attacker's script is injected into an HTML response before it passes through the `cf-hardhat` CSP middleware with `autoInjectTags` enabled, the malicious script element would indeed get a valid nonce and be allowed to run by the browser.

How could an unwanted script get into a page before passing through the middleware?

This could happen if a persisted XSS payload is used *unsanitized* to dynamically build a web page. To mitigate this risk, any application accepting untrusted input should **always** validate and/or sanitize input server-side, and any application rendering untrusted content should **always** encode output to ensure it remains *content* and doesn't become *code*.

If proper output encoding and input sanitization are employed, the risk of using `autoInjectTags` may be acceptable. See this [CSP Demo](https://csp-demo-app.pages.dev) to compare various strategies and their effects on security.

Applications should apply defense in depth according to a threat model.

See more at [Mozilla Developer docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src)

## Cross-Origin Resource Sharing (CORS) Middleware
This middleware sets headers that control how a site may be accessed - notably, which origins may access a site.

### Features
- Respond to Preflight OPTIONS requests with CORS headers and 204 No Content
- Add CORS headers to responses

### Usage
```typescript
import {getCorsMiddleware} from "cf-hardhat/cors";
// Use default values
const corsMiddleware = getCorsMiddleware();
// or provide custom:
const corsMiddleware = getCorsMiddleware({
    'access-control-allow-origin': ['https://example.com'], 
    'access-control-allow-methods': ['GET', 'POST'],
    'access-control-allow-headers': ['X-Requested-By']
});

export const onRequest = [
    // ... other PagesFunctions
    corsMiddleware
];
```

## HTTP Strict Transport Security
This middleware adds the `Strict-Transport-Security` header to responses, which tells the browser "only load this site (and subdomains) over encrypted HTTPS"

```typescript
import { getHstsMiddleware } from "cf-hardhat/hsts";

const hstsMiddleware = getHstsMiddleware();
// Using defaults, resulting header is:
// Strict-Transport-Security: max-age=31536000, includeSubdomains
export const onRequest = [
    // ... other PagesFunctions
    hstsMiddleware
];
```


