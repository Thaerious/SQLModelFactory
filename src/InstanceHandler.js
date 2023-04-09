/**
 * Handles the storage and retrieval of instanced data.
 */
export class InstanceHandler {
    constructor(factory, idx, table, model, data) {
        this.factory = factory;
        this.idx = idx;
        this.table = table;
        this.model = model;
        this.data = data;
    }

    /**
     * Handles retrieving values of the requested property from the stored data.
     * If the property is in the schema than the stored data is retreived, otherwise
     * the object properties are used.
     */
    get(target, prop) {
        if (prop.charAt(0) === "$") {
            const field = this[prop.substring(1)];
            if (typeof field === "function") {
                return this[prop.substring(1)].bind(this);
            } else {
                return this[prop.substring(1)];
            }
        }
        if (this.model[prop])
            return this.data[prop];
        return Reflect.get(...arguments);
    }

    /**
     * Handles setting and storing values. If the property is in the schema than data is store
     * in the db, otherwise the properties only exist on the object.
     */
    set(target, prop, value) {
        if (this.model.hasOwnProperty(prop)) {
            this.factory.__prepare(`
                UPDATE ${this.table}
                SET ${prop} = ?
                WHERE idx = ${this.idx}
            `).run(value);

            this.data[prop] = value;
            return true;
        } else {
            return Reflect.set(...arguments);
        }
    }

    /**
     * Remove this record from the table.
     * Call as instance.$delete().
     */
    delete() {
        return this.factory.__prepare(`
            DELETE FROM ${this.table} WHERE idx = ?
        `).run(this.idx);
    }
}
