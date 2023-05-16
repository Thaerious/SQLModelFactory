import expandModels from "./expandModels.js";

class ValueProxy {
    constructor(value, root) {
        this.value = value;
    }

    get(target, prop) {
        if (prop === "$deRef") return this.$deRef(target);
        if (!this.model[prop]) return Reflect.get(...arguments);

        if (!value && this[prop]) {
            return this[prop](primitive, prop);
        } else {
            return typeof value === 'function' ? value.bind(primitive) : value;
        }

        return new Proxy(this.model[prop], new ModelProxy(this.model[prop], this.root));
    }

    $deRef(name) {        
        if (Array.isArray(name)) name = name[0];
        if (name.startsWith("@")) name = name.substring(1);
        if (name.startsWith("[]")) name = name.substring(2);
        return new Proxy(this.model[name], new ModelProxy(this.model[name], this.root));
    }    
}

class ModelProxy {
    constructor(model, root) {
        this.root = root || model;
        this.model = model;
    }

    get(target, prop) {
        if (prop === "$deRef") return this.$deRef(target);
        if (!this.model[prop]) return Reflect.get(...arguments);

        if (typeof this.model[prop] === "string") {
            return new ValueProxy(this.model[prop], this.root);
        }
        return new Proxy(this.model[prop], new ModelProxy(this.model[prop], this.root));
    }
}

export default class Model {
    constructor(source) {
        Object.assign(this, expandModels(source));
        return new Proxy(this, new ModelProxy(this));
    }
}