import { InstanceHandler } from "./InstanceHandler.js";
import { divideObject } from "./divideObject.js";

/**
 * Handles the storage and retrieval of instanced array data.
 */
export class ArrayInstanceHandler extends InstanceHandler {
    /**
     * Handles setting and storing values. The data is stored with both the root index
     * and array index.
     */
    set(target, prop, value) {
        if (prop !== "length") {
            target[prop] = value;

            const divided = divideObject({
                idx: prop,
                root_idx: this.idx,
                ...value,
            });

            this.factory.__prepare(`
                INSERT OR REPLACE INTO ${this.table}
                (${divided.keys.join()})
                VALUES
                (${divided.placeHolders})
            `).run(divided.values);

            return true;
        } else {
            return Reflect.set(...arguments);
        }
    }

    deleteProperty(target, prop) {
        if (prop in target) {
            delete target[prop];
            this.factory.__prepare(`
                DELETE FROM ${this.table} WHERE idx = ?
            `).run(prop);
            return true;
        }
    }
}
