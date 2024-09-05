import {Context} from "./common.ts";

import { Element} from "@cloudflare/workers-types";

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
const nonceHandlers: {[key in NonceTag]: (nonce: string) => HTMLRewriterElementContentHandlers} = {
    'script': (nonce: string) => new ScriptNonceHandler(nonce),
    'style': (nonce: string) => new InlineStyleNonceHandler(nonce),
    'link': (nonce: string) => new StylesheetLinkNonceHandler(nonce),
}
export const nonceHandlerFactory = (tag: NonceTag, nonce: string) => {
    return nonceHandlers[tag](nonce);
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
    private readonly nonceDirectives: CspDirective[];

    constructor(cspItems: CspItem[], nonceDirectives?: CspDirective[]) {
        this.policyItems = cspItems;
        this.nonceDirectives = nonceDirectives ? nonceDirectives : [];
    }

    useNonce(nonce: string) {
        const nonceString = `'nonce-${nonce}'`;
        for (let directive of this.nonceDirectives) {
            let existingPolicy = this.getPolicy(directive);
            if (existingPolicy) {
                existingPolicy.prependValue(nonceString);
            } else {
                this.policyItems.push(new CspItem(directive, nonceString));
            }
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


const resolvePolicies = (policies: Policies, context: Context): CspItem[] => {
    let resolvedPolicies: CspItem[] = []
    Object.entries(policies).map(([directive, sourceVal]) => {
        if (!!sourceVal) {
            if (typeof sourceVal === 'function') {
                resolvedPolicies.push(new CspItem(directive as CspDirective, sourceVal(context)));
            } else if (Array.isArray(sourceVal)) {
                resolvedPolicies.push(new CspItem(directive as CspDirective, ...sourceVal))
            } else {
                resolvedPolicies.push(new CspItem(directive as CspDirective));
            }
        }
    });
    return resolvedPolicies;
}
export const getDefaultNonceTags = (): NonceTag[] => {
    return [];
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
        "upgrade-insecure-requests": [""],
    }
}

export const getDefaultOptions = (): CspOptions => {
    return {
        nonce: {
            autoInjectTags: getDefaultNonceTags(),
            directives: getDefaultNonceDirectives()
        },
        policies: getDefaultPolicies()
    }
}

type NonceTag = "script" | "style" | "link";

export interface CspOptions {
    nonce?: {
        autoInjectTags?: NonceTag[],
        directives?: CspDirective[],
        callback? : NoncePagesFunctionFactory
    } | boolean;
    policies?: Policies;
}

type NormalizedCspOptions = {
    policies: Policies
    nonceDirectives: CspDirective[],
    callback: NoncePagesFunctionFactory
}
export const getNormalizedOptions = (cspOptions?: CspOptions): NormalizedCspOptions => {
    const config = cspOptions ? cspOptions : getDefaultOptions();
    let autoInjectNonceTags: NonceTag[];
    let nonceDirectives: CspDirective[];
    let callback: NoncePagesFunctionFactory;
    if (typeof config.nonce === "boolean" && !config.nonce) {
        nonceDirectives = [];
        autoInjectNonceTags = [];
    } else if (typeof config.nonce === "object") {
        nonceDirectives = config.nonce?.directives ? config.nonce.directives : getDefaultNonceDirectives()
        autoInjectNonceTags = config.nonce?.autoInjectTags ? config.nonce.autoInjectTags : getDefaultNonceTags()
        callback = config.nonce?.callback ? config.nonce.callback : defaultCallback;
    } else {
        nonceDirectives = getDefaultNonceDirectives();
        autoInjectNonceTags = getDefaultNonceTags();
    }

    if (autoInjectNonceTags.length > 0) {
        callback = getAutoInjectNonceFunctionFactory(autoInjectNonceTags);
    }
    const policies = config.policies ? config.policies : getDefaultPolicies()
    return {policies, nonceDirectives, callback};
};

const _getCspFactory = ({policies, nonceDirectives} : NormalizedCspOptions) => {
    return (context: Context, nonceValue?: string) => {
        const resolvedPolicies = resolvePolicies(policies, context);
        let csp = new ContentSecurityPolicy(resolvedPolicies, nonceDirectives);
        if (nonceValue) {
            csp.useNonce(nonceValue);
        }
        return csp;
    };
}
export const getCspFactory = (cspOptions: CspOptions) => {
    const normalizedOpts = getNormalizedOptions(cspOptions);
    return  _getCspFactory(normalizedOpts);
}
export type NoncePagesFunctionFactory = (nonce: string) => PagesFunction<unknown, any, Record<string, unknown>>;

const defaultCallback: NoncePagesFunctionFactory = (_: string) => {
    return async (context) => {
        return await context.next();
    }
}
const getAutoInjectNonceFunctionFactory = (autoInjectTags: NonceTag[]) : NoncePagesFunctionFactory => {
    return (nonce: string) => {
        return async (context) => {
            let response = await context.next();
            let rewriter = new HTMLRewriter;
            for (let nonceTag of autoInjectTags) {
                const handler = nonceHandlerFactory(nonceTag, nonce);
                rewriter = rewriter.on(nonceTag, handler);
            }
            return rewriter.transform(response);
        }
    }
}


export const getCspMiddleware = (cspOpts: CspOptions) => {
    const opts: NormalizedCspOptions = getNormalizedOptions(cspOpts);
    const cspFactory = _getCspFactory(opts);
    const cspNonceWrapper: PagesFunction = async (context) => {
        let nonce = generateNonce();
        let csp = cspFactory(context, nonce)
        let res: Response;
        if (!!opts.callback) {
            console.log("WRAPPER: Using nonce callback from opts");
            res = await opts.callback(nonce)(context);
        } else {
            console.log("WRAPPER: Using context.next()")
            res = await context.next();
        }
        res.headers.set("Content-Security-Policy", csp.toString());
        return res;
    }
    return cspNonceWrapper
}
