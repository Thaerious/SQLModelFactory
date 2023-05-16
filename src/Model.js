import expandModels from "./expandModels.js";

class ModelProxy {
    constructor(model, root) {
        this.root = root || model;
        this.model = model;
    }

    get(target, prop) {
        if (prop === "$deRef") return this.$deRef(target);
        if (!this.model[prop]) return Reflect.get(...arguments);
        return new Proxy(this.model[prop], new ModelProxy(this.model[prop], this.root));
    }

    $deRef(name) {        
        if (Array.isArray(name)) name = name[0];
        if (name.startsWith("@")) name = name.substring(1);
        if (name.startsWith("[]")) name = name.substring(2);
        return new Proxy(this.model[name], new ModelProxy(this.model[name], this.root));
    }
}

export default class Model {
    constructor(source) {
        Object.assign(this, expandModels(source));
        return new Proxy(this, new ModelProxy(this));
    }
}