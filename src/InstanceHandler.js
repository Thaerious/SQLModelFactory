import { classNameFromModel, extractClass, hasReference } from "./extractClass.js";

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
        if (typeof prop === "string" && prop.startsWith("$")) {
            return Reflect.get(this, prop.substring(1));
        }

        if (prop in target) {
            return Reflect.get(target, prop);
        }

        return Reflect.get(this, prop);
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
        for (const key of Object.keys(this.$model)) {
            if (key.startsWith("$")) continue;
            if (Array.isArray(this.$model[key])) {
                const childModel = this.$model[key];
                const childTableName = `${this.$tableName}_${key}`

                this.$prepare(`
                    DELETE FROM ${childTableName} WHERE ridx = ?
                `).run(this.idx);
            }
        }

        this.instantiated.delete(this.idx);

        return this.$prepare(`
            DELETE FROM ${this.$tableName} WHERE idx = ?
        `).run(this.idx);
    }

    prepare(sql) {
        return this.factory.prepare(sql);
    }
}
