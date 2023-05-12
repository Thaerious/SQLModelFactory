import InstanceHandler from "./InstanceHandler.js";

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
export default class ArrayInstanceHandler extends InstanceHandler {
    /**
     * @param {ModelFactory} factory - Shared factory object that created this instance.
     * @param {Integer} idx - The index of the object this belongs to.
     * @param {Integer} tableName - The table name that contains child entries.
     * @param {Integer} model - The model object associated with this handler.
     * @param {Map} instantiated - Previously constructed instances.
     * @param {Function} constructor - Instance constructor.
     */
    constructor({factory, idx, tableName, model, map, constructor}) {
        super(factory, idx, tableName, model, map, constructor);
        this.createTables();
    }

    /**
     * Handles setting and storing values in an array field.
     */
    set(target, prop, value) {
        console.log("AIH.SET");
        console.log("- target", target);
        console.log("- prop", prop);
        console.log("- value", value);

        if (this.factory.isReflected(value)) {
            const aClass = this.factory.getClass(this.model);
            if (value instanceof aClass === false) {
                throw new ReflectiveTypeError(prop, value);
            }
            return this.setAndReflect(target, prop, value);
        }
        else if (Array.isArray(value)) {
            throw new Error("todo?");
        }
        else if (typeof value === "object") {
            const aClass = this.factory.getClass(this.model);
            value.ridx = this.idx;
            return this.setAndReflect(target, prop, new aClass(value));
        }

        if (prop === "length") {
            return Reflect.set(...arguments);
        }

        throw new TypeError(`Expected 'object' found '${typeof value}'`);
    }

    setAndReflect(target, prop, value) {
        this.prepare(`
            INSERT OR REPLACE INTO ${this.tableName}
            (aidx, ridx, oidx)
            VALUES
            (?, ?, ?)
        `).run(prop, this.idx, value.idx);

        return Reflect.set(target, prop, value);
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

        // console.log("ARRAY PROP DELETE");
        // if (prop in target) {
        //     delete target[prop];
        //     this.prepare(`
        //         DELETE FROM ${this.tableName} WHERE aidx = ? AND ridx = ?
        //     `).run(prop, this.idx);
        //     return true;
        // }
    }
}
