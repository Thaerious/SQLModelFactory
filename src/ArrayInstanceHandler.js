import InstanceHandler from "./InstanceHandler.js";

class NonReflectiveError extends Error {
    constructor(prop, value) {
        super("Can only assign reflected objects to a managed array");
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
        if (typeof value === "object") {
            if (!value.$tableName) throw new NonReflectiveError(prop, value);
            
            this.prepare(`
                INSERT OR REPLACE INTO ${this.tableName}
                (aidx, ridx, oidx)
                VALUES
                (?, ?, ?)
            `).run(prop, this.idx, value.idx);

            return Reflect.set(...arguments);
        }

        if (target.hasOwnProperty(prop)) return Reflect.set(...arguments);
        throw new NonReflectiveError(prop, value);
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
