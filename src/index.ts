export const generateNonce = (): string => {
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


export enum CspDirective {
    baseUri = "base-uri",
    childSrc = "child-src",
    connectSrc = "connect-src",
    defaultSrc = "default-src",
    fontSrc = "font-src",
    formAction = "form-action",
    frameAncestors = "frame-ancestors",
    frameSrc = "frame-src",
    imgSrc = "img-src",
    manifestSrc = "manifest-src",
    mediaSrc = "media-src",
    objectSrc = "object-src",
    reportTo = "report-to",
    sandbox = "sandbox",
    scriptSrc = "script-src",
    scriptSrcAttr = "script-src-attr",
    scriptSrcElem = "script-src-elem",
    styleSrc = "style-src",
    styleSrcAttr = "style-src-attr",
    styleSrcElemn = "style-src-elem",
    upgradeInsecureRequests = "upgrade-insecure-requests",
    workerSrc = "worker-src"
}

class CspItem {
    directive: CspDirective;
    private values: string[]

    constructor(directive: CspDirective, ...values: string[]) {
        this.directive = directive;
        this.values = values;
    }

    prependValue(value: string) {
        this.values.unshift(value);
    }

    toString() {
        return `${this.directive.toString()} ${this.values.join(' ')}`;
    }
}

export class ContentSecurityPolicy {
    private policyItems: CspItem[]

    constructor(cspOptions: CspOptions) {
        this.policyItems = []
        for (let key of Object.keys(cspOptions.basePolicies)) {
            if (!!cspOptions.basePolicies[key] && cspOptions.basePolicies[key].length > 0) {
                this.policyItems.push(new CspItem(CspDirective[key as keyof typeof CspDirective], ...cspOptions.basePolicies[key]));
            }
        }
    }

    useNonce(directive: CspDirective, nonce: string) {
        const nonceString = `'nonce-${nonce}'`;
        let existingPolicy = this.policyItems.filter((p) => p.directive === directive)?.[0];
        if (existingPolicy) {
            existingPolicy.prependValue(nonceString);
        } else {
            this.policyItems.push(new CspItem(directive, nonceString));
        }
    }

    toString() {
        return this.policyItems.map(p => p.toString()).join('; ');
    }
}

export interface CspOptions {
    nonceDirectives?: CspDirective[];
    basePolicies: {
        defaultSrc?: string[];
        scriptSrc?: string[];
        styleSrc?: string[];
        fontSrc?: string[];
        imgSrc?: string[];
        frameSrc?: string[];
        frameAncestors?: string[];
        objectSrc?: string[];
        baseUri?: string[];
    },

}

export const getNonceSense = (cspOptions: CspOptions): PagesFunction => {
    const setCspWithNonce: PagesFunction = async (context) => {
        const response = await context.next();
        let abcd = context.env["ABCD"]
        const nonce = generateNonce();
        let csp = new ContentSecurityPolicy(cspOptions)
        const nonceDirs = cspOptions.nonceDirectives ? cspOptions.nonceDirectives : [CspDirective.scriptSrc, CspDirective.styleSrc];
        for (let directive of nonceDirs) {
            csp.useNonce(directive, nonce);
        }
        response.headers.set('Content-Security-Policy', csp.toString());

        return new HTMLRewriter()
            .on('script', new ScriptNonceHandler(nonce))
            .on('link', new StylesheetLinkNonceHandler(nonce))
            .on('style', new InlineStyleNonceHandler(nonce))
            .transform(response);
    }
    return setCspWithNonce;
}