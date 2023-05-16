class FieldProxy {
    /**
     * Value must start with @ or [] and can be nested in an array with @.
     */
    constructor(models, value, parent) {
        this.models = models;
        this.parent = parent;

        if (Array.isArray(value)) value = `[]${value[0].substring(1)}`;
        return new Proxy({ value: value }, this);
    }

    get(target, prop) {
        const primitive = Reflect.get(target, 'value');
        const value = primitive[prop];

        if (!value && this[prop]) {
            return this[prop](primitive, prop);
        } else {
            return typeof value === 'function' ? value.bind(primitive) : value;
        }
    }

    getOwnPropertyDescriptor(target, prop) {
        if (prop === "value") {
            return {writeable: false, configurable: true, enumerable: true, value: target[prop] };
        } else {
            return {writeable: false, configurable: true, enumerable: false, value: target[prop] };
        }
    }

    ownKeys(target) {
        return ["value"];
    }

    type(primitive) {
        const model = this.deRef(primitive);
        if (this.isRef(primitive) && model.$nested) return "nested_object";
        if (this.isArray(primitive) && model.$nested) return "nested_array";
        if (this.isRef(primitive) && !model.$nested) return "ref_object";
        if (this.isArray(primitive) && !model.$nested) return "ref_array"; 
        return "primitive";
    }

    tableName(primitive) {
        if (this.isRef(primitive)) return primitive.substring(1).toLowerCase();
        if (this.isArray(primitive)) return primitive.substring(2).toLowerCase();
        throw new Error(`No table reference found: ${primitive}`);
    }

    isArray(primitive) {
        return primitive.startsWith("[]");
    }

    isRef(primitive) {
        return primitive.startsWith("@");
    }

    deRef(primitive) {
        if (this.isRef(primitive)) return this.models[primitive.substring(1)];
        if (this.isArray(primitive)) return this.models[primitive.substring(2)];
        return primitive;
    }

    indexTable(primitive, prop) {
        if (this.deRef(primitive).$nested) {
            throw new Error("indexTable only implemented for non-nested fields");
        }
        return `${this.parent.$tablename}_${prop.toLowerCase()}`
    }
}

class ModelProxy {
    constructor(models, source) {
        this.model = {}

        const proxy = new Proxy(this.model, this);

        for (const field of Object.keys(source)) {
            if (field.toString().startsWith("$")) {
                this.model[field] = source[field];
            } else {
                this.model[field] = new FieldProxy(models, source[field], proxy);
            }
        }

        return proxy;
    }

    get(target, prop) {        
        if (prop === "$") return target;
        if (prop.toString().startsWith("$")) {
            if (this[prop]) {
                const value = this[prop];
                return typeof value === 'function' ? value.bind(target) : value;
            } else {
                const value = target[prop];
                return typeof value === 'function' ? value.bind(target) : value;
            }
        }

        return Reflect.get(...arguments);
    }

    set(target, prop, value) {
        // console.log("Model Set", prop, value);

        if (prop.toString().startsWith("$")) {
            return Reflect.set(...arguments);
        }

        return Reflect.set(target, prop, new FieldProxy(target, value, this));
    }

    ownKeys(target) {
        return Object.keys(target).filter(key => !key.startsWith("$"));
    }
}

export { FieldProxy, ModelProxy }
