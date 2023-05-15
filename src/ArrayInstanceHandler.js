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
     * Handles setting and storing values in an array field.
     */
    set(target, prop, value) {
        if (this.factory.isReflected(value)) {
            const aClass = this.factory.getClass(this.model);
            if (value instanceof aClass === false) {
                throw new ReflectiveTypeError(prop, value);
            }
            return this.setAndReflect(target, prop, value);
        }
        else if (Array.isArray(value)) {
            // ???
        }
        else if (typeof value === "object") {
            const aClass = this.factory.getClass(this.model);
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
        console.log("ARRAY INSTANCE DELETE PROPERTY");
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
