import { extractClass } from "./extractClass.js";

/**
 * Handles the storage and retrieval of instanced data.
 */
export default class InstanceHandler {
    /**
     * @param {ModelFactory} factory - Shared factory object that created this instance.
     * @param {Integer} idx - The index of the object this belongs to.
     * @param {Integer} tableName - The table name that contains child entries.
     * @param {Integer} model - The model object associated with this handler.
     * @param {Map} instantiated - Previously constructed instances.
     * @param {Function} aClass - Instance constructor.
     */
    constructor(idx, tableName, model, aClass) {
        this.factory = aClass.factory;
        this.idx = idx;
        this.tableName = tableName;
        this.model = model;
        this.instantiated = aClass.instantiated;
        this.constructor = aClass;
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
        if (prop === "ridx") throw new TypeError(`Cannot assign to read only property ${prop}`);
        
        if (this.model.hasOwnProperty(prop)) {
            if (typeof value !== "object") {
                return this._setPrim(...arguments);
            }
            else if (this.factory.isReflected(value)) {
                return this._setRef(...arguments);
            }
            else {
                return this._setNest(...arguments);
            }
        }

        return Reflect.set(...arguments);
    }

    _setPrim(_, prop, value) {
        this._updateDB(prop, value);
        return Reflect.set(...arguments);
    }

    _setNest(target, prop, value) {
        if (value === undefined) {
            target[prop].delete();
            target[prop].$delete();
            return Reflect.set(target, prop, instance);
        }
        else {
            const aClass = this.factory.getClass(this.model[prop]);
            const instance = new aClass(value);
            this._updateDB(prop, instance.idx);
            return Reflect.set(target, prop, instance);
        }        
    }

    _setRef(_, prop, value) {
        const aClass = this.factory.getClass(this.model[prop].deRef().$classname);
        if (value instanceof aClass === false) {
            throw new Error(`Reflective type error: expected ${aClass.name} found ${value.constructor.name}`);
        }

        this._updateDB(prop, value.idx);
        return Reflect.set(...arguments);
    }

    _updateDB(prop, value) {
        this.prepare(`
            UPDATE ${this.tableName}
            SET ${prop} = ?
            WHERE idx = ${this.idx}
        `).run(value);
    }

    deleteProperty(target, prop) {
        if (target[prop]) {
            if (target[prop].model.$nested) {
                target[prop].delete();
            }
        }

        return Reflect.deleteProperty(...arguments);
    }

    delete() {
        for (const key of Object.keys(this.$model)) {
            if (key.startsWith("$")) continue;
            if (Array.isArray(this.$model[key])) {
                const childTableName = `${this.$tableName}_${key}`

                this.$prepare(`
                    DELETE FROM ${childTableName} WHERE ridx = ?
                `).run(this.idx);
            }
        }

        if (this.model.$nested) this._removeFromParent();
        this._deleteThis();
    }

    _removeFromParent() {
        const parent = this.model.$nested.parent;
        const column = this.model.$nested.column;

        this.factory.prepare(`
            UPDATE ${parent} SET ${column} = NULL WHERE ${column} = ?
        `).run(this.idx);
    }

    _deleteThis() {
        this.instantiated.delete(this.idx);

        return this.$prepare(`
            DELETE FROM ${this.$tableName} WHERE idx = ?
        `).run(this.idx);
    }

    exists() {
        const all = this.prepare(`SELECT * FROM ${this.tableName} WHERE idx = ?`).all(this.idx);
        return all > 0;
    }

    prepare(sql) {
        return this.factory.prepare(sql);
    }
}
