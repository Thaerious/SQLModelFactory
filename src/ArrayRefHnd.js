import { InstanceHandler } from "./InstanceHandler.js";
import  divideObject  from "./divideObject.js";

/**
 * Handles the storage and retrieval of instanced array data.
 */
export class ArrayRefHnd extends InstanceHandler {
    /**
     * @param {ModelFactory} factory - Shared factory object that created this instance.
     * @param {Integer} idx - The index of the object this belongs to.
     * @param {Integer} tableName - The table name that contains child entries.
     * @param {Integer} model - The model object associated with this handler.
     */
    constructor(factory, idx, tableName, model) {
        super(factory, idx, tableName, model);
    }

    /**
     * Handles setting and storing values. The data is stored with both the root index
     * and array index.
     * 
     * @param {Integer} prop - A valid array index (number or string).
     */
    set(target, prop, value) {
        if (prop !== "length") {     
            target[prop] = value;
            
            this.$prepare(`
                INSERT OR REPLACE INTO ${this.tableName}
                (${prop})
                VALUES
                (?)
            `).run(value);

            return true;
        } else {
            return Reflect.set(...arguments);
        }
    }

    deleteProperty(target, prop) {
        if (prop in target) {
            delete target[prop];
            this.$prepare(`
                DELETE FROM ${this.tableName} WHERE idx = ?
            `).run(prop);
            return true;
        }
    }
}
