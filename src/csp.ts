import {Context} from "./common.js";

export const generateNonce = (): string => {
    return btoa(crypto.randomUUID());
}


export class ScriptNonceHandler {
    nonce: string;

    constructor(nonce: string) {
        this.nonce = nonce;
    }

    element(element: Element) {
        element.setAttribute('nonce', `${this.nonce}`)
    }
}

export class StylesheetLinkNonceHandler {
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

export class InlineStyleNonceHandler {
    nonce: string;

    constructor(nonce: string) {
        this.nonce = nonce;
    }

    element(element: Element) {
        element.setAttribute('nonce', `${this.nonce}`)
    }
}

export const nonceHandlerFactory = (tag: NonceTag, nonce: string) => {
    switch (tag) {
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
    readonly values: string[]

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

    constructor(policies: Policies, context?: Context) {
        this.policyItems = []

        for (let key of Object.keys(policies)) {
            if (!!policies[key]) {
                if (typeof policies[key] === 'function') {
                    let value = policies[key](context);
                    this.policyItems.push(new CspItem(key as CspDirective, value));
                } else if (typeof policies[key] === 'object') {
                    this.policyItems.push(new CspItem(key as CspDirective, ...policies[key]));
                } else {
                    this.policyItems.push(new CspItem(key as CspDirective));
                }
            }
        }
    }

    useNonce(directive: CspDirective, nonce: string) {
        const nonceString = `'nonce-${nonce}'`;
        let existingPolicy = this.getPolicy(directive);
        if (existingPolicy) {
            existingPolicy.prependValue(nonceString);
        } else {
            this.policyItems.push(new CspItem(directive, nonceString));
        }
    }

    toString() {
        return this.policyItems.map(p => p.toString()).join('; ');
    }

    getPolicy(directive: CspDirective): CspItem {
        return this.policyItems.filter(p => p.directive === directive)?.[0]
    }
}


type SourceValueFunction = (context: Context) => string;
type SourceValue = SourceValueFunction | string[] | boolean;

export type Policies = {
    [key in CspDirective]?: SourceValue
};

export const getDefaultNonceTags = (): NonceTag[] => {
    return ["script", "style", "link"];
}
export const getDefaultNonceDirectives = (): CspDirective[] => {
    return [
        'script-src' as CspDirective,
        "style-src" as CspDirective
    ];
}

export const getDefaultPolicies = (): Policies => {
    return {
        "base-uri": ["'self'"],
        "default-src": ["'self'"],
        "font-src": ["'self'"],
        "form-action": ["'self'"],
        "frame-ancestors": ["'self'"],
        "img-src": ["'self'"],
        "object-src": ["'none'"],
        "script-src": ["'self'"],
        "script-src-attr": ["'none'"],
        "style-src": ["'self'"],
        "upgrade-insecure-requests": [""],
    }
}

export const getDefaultOptions = (): CspOptions => {
    return {
        nonce: {
            tags: getDefaultNonceTags(),
            directives: getDefaultNonceDirectives()
        },
        policies: getDefaultPolicies()
    }
}

type NonceTag = "script" | "style" | "link";

export interface CspOptions {
    nonce?: {
        tags?: NonceTag[],
        directives?: CspDirective[]
    } | boolean;
    policies?: Policies;
}
type NormalizedCspOptions = {
    nonceTags: NonceTag[],
    nonceDirectives: CspDirective[],
    policies: Policies
}
export const getNormalizedOptions = (cspOptions?: CspOptions) : NormalizedCspOptions => {
    const config = cspOptions ? cspOptions : getDefaultOptions();
    let nonceTags: NonceTag[];
    let nonceDirectives: CspDirective[];

    if (typeof config.nonce === "boolean" && !config.nonce) {
        nonceDirectives = [];
        nonceTags = [];
    } else if (typeof config.nonce === "object") {
        nonceDirectives = config.nonce?.directives ? config.nonce.directives : getDefaultNonceDirectives()
        nonceTags = config.nonce?.tags ? config.nonce.tags : getDefaultNonceTags()
    } else {
        nonceDirectives = getDefaultNonceDirectives();
        nonceTags = getDefaultNonceTags();
    }
    const policies = config.policies ? config.policies : getDefaultPolicies()
    return {nonceTags, nonceDirectives, policies};
};
export const getCspMiddleware = (cspOptions?: CspOptions): PagesFunction => {

    const {policies, nonceDirectives, nonceTags} = getNormalizedOptions(cspOptions);
    return async (context: EventContext<unknown, any, Record<string, string>>) => {
        const response = await context.next();
        const nonce = generateNonce();
        let csp = new ContentSecurityPolicy(policies, context)

        for (let directive of nonceDirectives) {
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
}