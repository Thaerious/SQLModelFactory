import expandModels from "./expandModels.js";

class Value {
    constructor(value, root) {
        this.root = root;
        this.value = value;
    }

    [Symbol.toPrimitive]() {
        return this.value;
    }

    deRef() {
        let name = this.value;
        if (Array.isArray(name)) name = name[0];
        if (name.startsWith("@")) name = name.substring(1);
        if (name.startsWith("[]")) name = name.substring(2);
        return new Proxy(this.root[name], new ModelProxy(this.root[name], this.root));
    }

    isArray() {
    }
}

class ModelProxy {
    constructor(model, root) {
        this.root = root || model;
        this.model = model;
    }

    get(_, prop) {
        if (prop.startsWith("$")) {
            if (this[prop]) return this[prop].bind(this);
            return this.model[prop];
        }

        let value = this.model[prop];
        if (Array.isArray(value)) value = value[0];

        if (typeof value === "object") {
            return new Proxy(value, new ModelProxy(value, this.root));
        }
        else if (typeof value === "string") {
            return new Value(this.model[prop], this.root);
        }
        else {
            return undefined;
        }
    }

    $isReference(prop) {
        const value = this.model[prop];
        if (typeof value !== "string") return false;
        const extract = /@[a-zA-Z0-9_]+/.exec(value);
        return extract != null;
    }

    $isArray(prop) {
        const value = this.model[prop];
        return Array.isArray(value);
    }
}

export default class Model {
    constructor(source) {
        Object.assign(this, expandModels(source));
        return new Proxy(this, new ModelProxy(this));
    }
}