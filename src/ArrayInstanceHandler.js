import InstanceHandler from "./InstanceHandler.js";
import { extractReference } from "./extractReference.js";

class NonReflectiveError extends Error {
    constructor(prop, value) {
        super("Can only assign reflected objects to a managed array");
        this.prop = prop;
        this.value = value;
    }
}

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
        if (this.factory.isReflective(value)) {
            const aClass = this.factory.getClass(this.model);
            if (value instanceof aClass === false) {
                throw new ReflectiveTypeError(prop, value);
            }
            return this.setAndReflect(target, prop, value);
        }
        else if (typeof value === "object") {
            const aClass = this.factory.getClass(this.model);
            return this.setAndReflect(target, prop, new aClass(value));
        }

        if (target.hasOwnProperty(prop)) return Reflect.set(...arguments);
        throw new NonReflectiveError(prop, value);
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
        if (prop in target) {
            delete target[prop];
            this.prepare(`
                DELETE FROM ${this.tableName} WHERE aidx = ?
            `).run(prop);
            return true;
        }
    }
}
