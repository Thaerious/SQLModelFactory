import expandModels from "./expandModels.js";
import logger from "./logger/setupLogger.js";

class Value {
    constructor(value, field, root, parentModel) {
        this.root = root;
        this.value = value;
        this.field = field;
        this.parentModel = parentModel;
    }

    [Symbol.toPrimitive]() {
        return this.value;
    }

    deRef() {
        let parsedValue = this.value;

        if (this.isPrimitive()) {
            throw new Error(`Cannot dereference a primitive field:`, this.root[this.value]);
        }

        if (Array.isArray(this.value)) parsedValue = this.value[0];
        if (parsedValue.startsWith("@")) parsedValue = parsedValue.substring(1);
        if (parsedValue.startsWith("[]")) parsedValue = parsedValue.substring(2);

        //logger.log(this.root[name], name); // <-- need to extract the class name
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
        return `${this.parentModel.$tablename}_${this.field}`.toLowerCase();
    }
}

class ModelProxy {
    constructor(model, rootModel) {
        this.root = rootModel || model;
        this.model = model;
    }

    get(_, prop) {
        if (typeof prop === "symbol") {
            return Reflect.get(...arguments);
        }

        if (prop.startsWith("$")) {
            if (this[prop]) return this[prop].bind(this);
            return this.model[prop];
        }

        let value = this.model[prop];
        if (Array.isArray(value)) value = value[0];

        if (typeof value === "object") {
            return value;
        }
        else if (typeof value === "string") {
            return new Value(this.model[prop], prop, this.root, this.model);
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

class Model {
    constructor(source) {
        Object.assign(this, expandModels(source));
    }
}

export { Model as default, ModelProxy, Value }