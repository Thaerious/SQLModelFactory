import InstanceHandler from "./InstanceHandler.js";
import divideObject from "./divideObject.js";

class ReflectiveTypeError extends Error {
    constructor(prop, value) {
        super("Reflective array item does not match model type");
        this.prop = prop;
        this.value = value;
    }
}

/**
 * Handles the storage and retrieval of instanced array data.
 * aidx : array index
 * ridx : root (parent) index
 * oidx : index of the object being assigned
 */
export default class ArrayInstanceHandler {
    /**
     * @param {ModelFactory} factory - Shared factory object that created this instance.
     * @param {Integer} ridx - The index of the object this belongs to (root-idx).
     * @param {Integer} tableName - The table name that contains child entries.
     * @param {Integer} model - The model object associated with this handler.
     * @param {Map} instantiated - Previously constructed instances.
     * @param {Function} constructor - Instance constructor.
     */
    constructor({factory, idx: ridx, tableName, model, indexModel, map, constructor}) {
        this.factory = factory;
        this.ridx = ridx;
        this.tableName = tableName;
        this.model = model;
        this.indexModel = indexModel;
        this.instantiated = map;
        this.constructor = constructor;

        return new Proxy([], this);
    }

    /**
     * Handles setting and storing values in an array field.
     */
    set(target, aidx, value) {
        const div = divideObject(value);                
        const oidx = this._setObjectIf(value);

        this.factory.prepare(`
            INSERT INTO ${this.indexModel.$tablename} (aidx, oidx, ridx)
            VALUES (?, ?, ?)
        `).run(aidx, oidx, this.ridx);

        return Reflect.set(...arguments);
    }

    _setObjectIf(value) {
        if (!this.factory.isReflected(value)) {
            return this.factory.prepare(`
                INSERT INTO ${this.model.$tablename} (${div.keys})
                VALUES (${div.placeHolders})
            `).run(div.values).lastInsertRowid;
        }        

        return value.idx;
    }

    /**
     * Handles removing (deleting) data from an array field.
     */
    deleteProperty(target, prop) {
        const model = this.factory.getModel(this.model)

        if (target[prop]) {
            if (model.$nested) {
                this.factory.prepare(`
                    DELETE FROM ${model.$indexTable} WHERE oidx = ?                
                `).run(target[prop].idx);

                this.factory.prepare(`
                    DELETE FROM ${model.$classname.toLowerCase()} WHERE idx = ?                
                `).run(target[prop].idx);
            }
        }

        return Reflect.deleteProperty(...arguments);
    }
}
