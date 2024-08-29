import {ContentOptions, Element} from "@cloudflare/workers-types";

class MockAttributes implements IterableIterator<string[]> {

    private _attributes: { [key: string]: string };
    private i = 0;

    constructor() {
    }

    [Symbol.iterator]() {
        return this;
    }

    next(...args: [] | [undefined]): IteratorResult<string[], any> {
        let keys = Object.keys(self)
        if (this.i < keys.length) {
            return {value: [this._attributes[keys[this.i++]]], done: false}
        } else {
            return {value: undefined, done: true};
        }
    }
    return?(value?: any): IteratorResult<string[], any> {
        throw new Error("Method not implemented.");
    }
    throw?(e?: any): IteratorResult<string[], any> {
        throw new Error("Method not implemented.");
    }
}

export class MockElement implements Element {
    attributes: IterableIterator<string[]>;
    removed: boolean;
    namespaceURI: string;

    constructor(readonly tagName: string) {
        this.attributes = new MockAttributes();
    }

    getAttribute(name: string): string | null {
        return this.attributes[name];
    }

    hasAttribute(name: string): boolean {
        return this.attributes[name] !== undefined
    }

    setAttribute(name: string, value: string): Element {
        this.attributes[name] = value;
        return this;
    }

    removeAttribute(name: string): Element {
        delete this.attributes[name];
        return this;
    }
    before(content: string, options?: ContentOptions): Element {
        throw new Error("Method not implemented.");
    }
    after(content: string, options?: ContentOptions): Element {
        throw new Error("Method not implemented.");
    }
    prepend(content: string, options?: ContentOptions): Element {
        throw new Error("Method not implemented.");
    }
    append(content: string, options?: ContentOptions): Element {
        throw new Error("Method not implemented.");
    }
    replace(content: string, options?: ContentOptions): Element {
        throw new Error("Method not implemented.");
    }
    remove(): Element {
        throw new Error("Method not implemented.");
    }
    removeAndKeepContent(): Element {
        throw new Error("Method not implemented.");
    }
    setInnerContent(content: string, options?: ContentOptions): Element {
        throw new Error("Method not implemented.");
    }
    onEndTag(handler: (tag: EndTag) => void | Promise<void>): void {
        throw new Error("Method not implemented.");
    }
}
