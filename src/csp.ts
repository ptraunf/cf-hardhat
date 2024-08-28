import {Context} from "./common.js";

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

const nonceHandlerFactory = (tag: NonceTag, nonce: string) => {
    switch (tag){
        case 'script':
            return new ScriptNonceHandler(nonce);
        case 'style':
            return new InlineStyleNonceHandler(nonce);
        case 'link':
            return new StylesheetLinkNonceHandler(nonce);
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

    getValues(): string[] {
        return this.values;
    }
}

export class ContentSecurityPolicy {
    private policyItems: CspItem[]

    constructor(cspOptions: CspOptions, context?: Context) {
        this.policyItems = []
        for (let key of Object.keys(cspOptions.basePolicies)) {
            if (!!cspOptions.basePolicies[key] && cspOptions.basePolicies[key].length > 0) {
                if (typeof cspOptions.basePolicies[key] === 'function') {
                    let value = cspOptions.basePolicies[key](context);
                    this.policyItems.push(new CspItem(key as CspDirective, value));
                } else {
                    this.policyItems.push(new CspItem(key as CspDirective, ...cspOptions.basePolicies[key]));
                }
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

    getValues(directive: CspDirective): string[] {
        return this.policyItems.filter(p => p.directive === directive)?.[0].getValues();
    }
}


type SourceValueFunction = (context: Context) => string;
type SourceValue = SourceValueFunction | string[];

type Policies = {
    [key in CspDirective]?: SourceValue;
};

type NonceTag = "script" | "style" | "link";
export interface CspOptions {
    nonceDirectives?: CspDirective[];
    nonceTags?: NonceTag[]
    basePolicies: Policies
}

export const getNonceSense = (cspOptions: CspOptions): PagesFunction => {
    const nonceDirs = cspOptions.nonceDirectives ? cspOptions.nonceDirectives : [CspDirective.scriptSrc, CspDirective.styleSrc];
    const nonceTags: NonceTag[] = cspOptions.nonceTags ? cspOptions.nonceTags : ["script", "style", "link"];

    const setCspWithNonce: PagesFunction = async (context: EventContext<unknown, any, Record<string, string>>) => {
        const response = await context.next();
        const nonce = generateNonce();
        let csp = new ContentSecurityPolicy(cspOptions, context)

        for (let directive of nonceDirs) {
            csp.useNonce(directive, nonce);
        }
        response.headers.set('Content-Security-Policy', csp.toString());

        let rewriter = new HTMLRewriter;

        for (let nonceTag of nonceTags) {
            const handler = nonceHandlerFactory(nonceTag, nonce);
            rewriter = rewriter.on(nonceTag, handler);
        }
        return rewriter.transform(response);
    }
    return setCspWithNonce;
}