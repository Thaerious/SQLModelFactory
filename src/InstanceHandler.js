import { classNameFromModel, extractClass, hasReference, isInferred } from "./extractClass.js";

/**
 * Handles the storage and retrieval of instanced data.
 */
export default class InstanceHandler {
    /**
     * @param {ModelFactory} factory - Shared factory object that created this instance.
     * @param {Integer} idx - The index of the object this belongs to.
     * @param {Integer} tableName - The table name that contains child entries.
     * @param {Integer} model - The model object associated with this handler.
     */
    constructor(factory, idx, tableName, model, map) {
        this.factory = factory;
        this.idx = idx;
        this.tableName = tableName;
        this.model = model;
        this.instantiated = map;
    }

    /**
     * Handles retrieving values of the requested property from the stored data.
     * If the property is in the schema than the stored data is retreived, otherwise
     * the object properties are used.
     */
    get(target, prop) {
        // '$' prefix returns fields from the handler.
        if (typeof prop === "string" && prop.startsWith("$")) {
            return Reflect.get(this, prop.substring(1));
        }

        // If the property exists on the target use the target.
        if (prop in target) {
            return Reflect.get(target, prop);
        }

        return Reflect.get(this, prop); // todo: look into this, should the default be return from handler and not return null/undefined?
    }

    /**
     * Handles setting and storing values. If the property is in the schema than data is store
     * in the db, otherwise the properties only exist on the object.
     */
    set(target, prop, value) {
        if (prop === "idx") throw new TypeError(`Cannot assign to read only property ${prop}`);

        if (this.model.hasOwnProperty(prop)) {
            const ref = extractClass("", this.model[prop]);

            if (typeof value !== "object") {
                this._setVal(prop, value);
                return Reflect.set(...arguments);
            }
            else if (this.factory.isReflected(value)) {
                const aClass = this.factory.getClass(this.model[prop]);
                if (value instanceof aClass === false) {
                    throw new Error(`Reflective type error: expected ${aClass.name} found ${value.constructor.name}`);
                }

                this._setVal(prop, value.idx);
                return Reflect.set(...arguments);
            } else {
                const aClass = this.factory.getClass(this.model[prop]);
                const instance = new aClass(value);
                this._setVal(prop, instance.idx);
                return Reflect.set(target, prop, instance);
            }
        }

        return Reflect.set(...arguments);
    }

    _setVal(prop, value) {
        this.prepare(`
            UPDATE ${this.tableName}
            SET ${prop} = ?
            WHERE idx = ${this.idx}
        `).run(value);
    }

    delete() {
        console.log("delete", this);

        for (const key of Object.keys(this.$model)) {
            if (key.startsWith("$")) continue;
            if (Array.isArray(this.$model[key])) {
                const childTableName = `${this.$tableName}_${key}`

                this.$prepare(`
                    DELETE FROM ${childTableName} WHERE ridx = ?
                `).run(this.idx);
            }
        }

        this._deleteInferredObjects();
        this._deleteInferredArrays();        
        this._deleteThis();
    
    }

    _deleteThis() {
        this.instantiated.delete(this.idx);

        return this.$prepare(`
            DELETE FROM ${this.$tableName} WHERE idx = ?
        `).run(this.idx);
    }

    _deleteInferredObjects() {
        for (const key of Object.keys(this.$model)) {
            if (!isInferred(this.$model[key])) continue;
            if (Array.isArray(this.$model[key])) continue;
            if (this[key] === undefined || this[key] === null) continue;

            const all = this.factory.prepare(
                `SELECT * FROM ${this.tableName} WHERE ${key} = ?
            `).all(this[key].idx);

            if (all.length <= 1) {
                this[key].$delete();
            }
        }
    }

    _deleteInferredArrays() {
        for (const key of Object.keys(this.$model)) {
            if (!isInferred(this.$model[key])) continue;
            if (!Array.isArray(this.$model[key])) continue;
            const aClass = this.factory.getClass(this.$model[key]);
            const table = aClass.tableName;

            for (const element of this[key]) {
                const all = this.factory.prepare(
                    `SELECT * FROM ${this.tableName}_${key} WHERE oidx = ?
                `).all(element.idx);   
                console.log(all.length);

                if (all.length <= 1) {
                    element.$delete();
                }                
            }
        }
    }    

    exists() {
        const all = this.prepare(`SELECT * FROM ${this.tableName} WHERE idx = ?`).all(this.idx);
        return all > 0;
    }

    prepare(sql) {
        return this.factory.prepare(sql);
    }
}
