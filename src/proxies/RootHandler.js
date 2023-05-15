import divideObject from "../divideObject.js";
import ArrayInstanceHandler from "./ArrayInstanceHandler.js";
import InstanceHandler from "./InstanceHandler.js";

export default class RootHandler {
    get tablename() { return this.model.$tablename }

    constructor({ factory: factory, model: model, idx: idx }) {
        this.factory = factory;
        this.model = model;
        this.idx = idx;
        return new Proxy(this, this);
    }

    /**
     * Proxy hook
     */
    deleteProperty(target, prop) {
        this.factory.prepare(`
                UPDATE ${this.tablename} SET ${prop} = ? WHERE idx = ?
            `).run(null, target.idx);

        target[prop] = null;
        return true;
    }

    set(_, prop, value) {
        if (!this.model[prop]) return Reflect.set(...arguments);

        console.log("set", prop, this.model[prop].type);
        switch (this.model[prop].type) {
            case "primitive":
                this._updatePrim(prop, value);
                return Reflect.set(...arguments);
            case "nested_object":
                this._updateObject(prop, value);
                return Reflect.set(this, prop, this._updateObject(prop, value));
            case "ref_object":
                this._updateObject(prop, value);
                return Reflect.set(this, prop, this._updateObject(prop, value));
            case "nested_array":
                this._updateArray(prop, value);
                return Reflect.set(...arguments);
            case "ref_array":
                this._updateArray(prop, value);
                return Reflect.set(...arguments);
        }
    }


    _updatePrim(prop, value) {
        this.factory.prepare(`
            UPDATE ${this.model.$tablename}
            SET ${prop} = ?
            WHERE idx = ${this.idx}
        `).run(value);
    }

    _updateObject(prop, value) {
        const div = divideObject(
            value,
            this.model[prop].deRef
        );

        const aClass = this.factory.classes[this.model[prop].deRef.$classname];
        const instance = new aClass(value);
        const indexTable = `${this.model.$tablename}_${prop}`;

        this.factory.prepare(`
            INSERT OR REPLACE INTO ${indexTable}
            (oidx, ridx) VALUES (?, ?)`
        ).run(instance.idx, this.idx);

        const proxy = new InstanceHandler({
            parent: this,
            tableName: this.model[prop].$tablename,
            model: this.model[prop].deRef,
            indexModel: this.factory.models[`${this.model.$classname}_${prop}`],
            map: this.instantiated,
            constructor: this.factory.classes[this.model[prop].deRef.classname]
        });

        return proxy;
    }

    _updateArray(prop, value) {
        const indexTable = `${this.model.$tablename}_${prop}`;

        this.factory.prepare(`
            DELETE FROM ${indexTable}
            WHERE ridx = ?`
        ).run(this.idx);

        if (value === undefined || value === null) return;

        this[prop] = new ArrayInstanceHandler(
            {
                factory: this.factory,
                idx: this.idx,
                tableName: this.model[prop].$tablename,
                model: this.model[prop].deRef,
                indexModel: this.factory.models[`${this.model.$classname}_${prop}`],
                constructor: this.factory.classes[this.model[prop].deRef.classname]
            }
        );

        for (const i in value) {
            this[prop][i] = value[i];
        }
    }
}