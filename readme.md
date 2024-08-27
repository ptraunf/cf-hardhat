# Nonce Sense

This middleware generates and inserts nonce values into `script`/`style`/`link` tags and `Content-Security-Policy` headers for Cloudflare Pages & Workers. This allows inline scripts to be loaded (more) securely in compliance with a restrictive CSP.

## Usage

```typescript
// In functions/_middleware.ts/js:
import {CspOptions, getNonceSense} from "csp-nonce-sense";

const cspOpts: CspOptions = {
    nonceTags: ["script", "style"], // script, style, and link are default nonce tags.
    basePolicies: {
        'frame-src': [ "'none'" ],
        ...   
    }
};

const nonceMiddleware = getNonceSense(cspOpts);

export const onRequest = [..., nonceMiddleware, ...];
```

*What's the point?* 

Allowing all inline scripts is a security risk; however, disallowing all inline scripts is inconvenient. Using nonces (in addition to hashes), a Content Security Policy can allow certain scripts and styles to load, provided they have the right value.

Disallowing all inline scripts is a mitigation for Cross-Site Scripting (XSS) attacks; a script injected by an attacker would not be allowed to run. 

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


See more at [Mozilla Developer docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src)