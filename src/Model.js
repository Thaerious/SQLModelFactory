import expandModels from "./expandModels.js";
import { extractClass } from "./extractClass.js";
import logger from "./logger/setupLogger.js";

function extractClassName(string) {
    return string.split(" ")[0];
}

class Value {
    constructor(value, field, root, parentModel) {
        this.root = root;
        this.value = value;
        this.key = field;
        this.parentModel = parentModel;
    }

    [Symbol.toPrimitive]() {
        return `${this.key}:${this.value}`;
    }

    get [Symbol.toStringTag]() {
        return `${this.key}:${this.value}`;
    }

    deRef() {
        let parsedValue = this.value;

        if (this.isPrimitive()) {
            throw new Error(`Cannot dereference a primitive field:`, this.root[this.value]);
        }

        if (Array.isArray(this.value)) parsedValue = this.value[0];
        parsedValue = parsedValue.split(" ")[0]; // extract first value as model name
        if (parsedValue.startsWith("@")) parsedValue = parsedValue.substring(1);
        if (parsedValue.startsWith("[]")) parsedValue = parsedValue.substring(2);

        return this.root[parsedValue];
    }

    isReference() {
        if (typeof this.value !== "string") return false;
        const extract = /@[a-zA-Z0-9_]+/.exec(this.value);
        return extract != null;
    }

    isArray() {
        if (typeof this.value !== "string") return false;
        const extract = /\[\][a-zA-Z0-9_]+/.exec(this.value);
        return extract != null;
    }

    isPrimitive() {
        if (this.isReference()) return false;
        if (this.isArray()) return false;
        return true;
    }

    isNested() {
        if (this.isPrimitive()) return false;
        return this.deRef().$nested !== undefined;
    }

    indexTable() {
        return `${this.parentModel.$tablename}_${this.key}`.toLowerCase();
    }
}

class ModelProxy {
    constructor(model, rootModel) {
        this.root = rootModel || model;
        this.model = model;
        
        if (!model.$append) model.$append = [];
    }

    get(_, prop) {
        if (prop === '$') return this;
        if (prop === Symbol.iterator) return Reflect.get(this, prop);
        if (typeof prop === "symbol") return Reflect.get(...arguments);
        if (prop.startsWith("$") && this[prop]) return Reflect.get(this, prop);
        if (prop.startsWith("$")) return Reflect.get(...arguments);

        let value = this.model[prop];

        if (typeof value === "object") return value;
        else if (typeof value === "string") return new Value(this.model[prop], prop, this.root, this.model);
        else return Reflect.get(...arguments);
    }

    [Symbol.iterator]() {
        let index = -1;
        const data = Object.keys(this).filter(e => !e.startsWith("$"));

        return {
            next: () => ({
                value: this[data[++index]],
                done: !(index in data)
            })
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

class Model {
    constructor(source) {
        Object.assign(this, expandModels(source));
    }
}

export { Model as default, ModelProxy, Value }