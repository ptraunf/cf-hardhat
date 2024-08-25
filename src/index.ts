const generateNonce = function (): string {
    return btoa(crypto.randomUUID());
}

class ScriptNonceHandler {
    nonce: string;

    constructor(nonce: string) {
        this.nonce = nonce;
    }

    element(element: Element) {
        element.setAttribute('nonce', `${this.nonce}`)
    }
}

class StylesheetLinkNonceHandler {
    nonce: string;

    constructor(nonce: string) {
        this.nonce = nonce;
    }

    element(element: Element) {
        if (element.getAttribute('rel') === 'stylesheet') {
            element.setAttribute('nonce', `${this.nonce}`)
        }
    }
}

class InlineStyleNonceHandler {
    nonce: string;

    constructor(nonce: string) {
        this.nonce = nonce;
    }

    element(element: Element) {
        element.setAttribute('nonce', `${this.nonce}`)
    }
}

export interface ContentSecurityPolicy {
    defaultSrc?: string;
    fontSrc?: string;
    imgSrc?: string;
    frameSrc?: string;
    frameAncestors?: string;
    objectSrc?: string;
    baseUri? : string;
}

export const getNonceMiddleware = (csp: ContentSecurityPolicy) : PagesFunction => {
    const defaultSrc = csp.defaultSrc ? `default-src ${csp.defaultSrc}` : "";
    const fontSrc = csp.fontSrc ? `font-src ${csp.fontSrc} ; ` : "";
    const imgSrc = csp.imgSrc ? `img-src ${csp.imgSrc} ; ` : "";
    const frameSrc = csp.frameSrc ? `frame-src ${csp.frameSrc} ; ` : "";
    const frameAncestors = csp.frameAncestors ? `frame-ancestors ${csp.frameAncestors} ; ` : "";
    const objectSrc = csp.objectSrc ? `object-src ${csp.objectSrc} ; ` : "";
    const baseUri = csp.baseUri ? `base-uri ${csp.baseUri} ; ` : "";

    const setNonce: PagesFunction = async (context) => {
        const response = await context.next();
        const nonce = generateNonce();
        const csp = [
            defaultSrc,
            `script-src 'nonce-${nonce}' 'strict-dynamic' ; `,
            `style-src 'nonce-${nonce}' 'strict-dynamic'; `,
            fontSrc,
            imgSrc,
            frameSrc,
            frameAncestors,
            objectSrc,
            baseUri
        ].join("");
        response.headers.set('Content-Security-Policy', csp);

        return new HTMLRewriter()
            .on('script', new ScriptNonceHandler(nonce))
            .on('link', new StylesheetLinkNonceHandler(nonce))
            .on('style', new InlineStyleNonceHandler(nonce))
            .transform(response);
    }
    return setNonce;
}