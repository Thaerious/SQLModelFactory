import { InstanceHandler } from "./InstanceHandler.js";
import  divideObject  from "./divideObject.js";

/**
 * Handles the storage and retrieval of instanced array data.
 * aidx : array index
 * ridx : root (parent) index
 * oidx : index of the object being assigned
 */
export class ArrayInstanceHandler extends InstanceHandler {
    /**
     * Handles setting and storing values. The data is stored with both the root index
     * and array index.
     */
    set(target, prop, value) {
        if (prop !== "length") {     
            target[prop] = value;

            if (!value.$tableName) {
                throw new Error("Can only assign reflected objects to managed array");
            }

            this.prepare(`
                INSERT OR REPLACE INTO ${this.tableName}
                (aidx, ridx, oidx)
                VALUES
                (?, ?, ?)
            `).run(prop, this.idx, value.idx);

            return true;
        } else {
            return Reflect.set(...arguments);
        }
    }

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
