/**
 * Handles the storage and retrieval of instanced data.
 */
export class InstanceHandler {
    /**
     * @param {ModelFactory} factory - Shared factory object that created this instance.
     * @param {Integer} idx - The index of the object this belongs to.
     * @param {Integer} tableName - The table name that contains child entries.
     * @param {Integer} model - The model object associated with this handler.
     */
    constructor(aClass, idx, tableName, model) {
        this.aClass = aClass;
        this.tableName = tableName;
        this.model = model;
        this.idx = idx;
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
        if (prop === "idx") {
            throw new Error("Can not update read-only field 'idx'");
        }

        if (this.model.hasOwnProperty(prop)) {
            if (this.model[prop].startsWith("@")) {
                this._setRef(prop, value);
            } else {
                this._setVal(prop, value);
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

    _setRef(prop, value) {
        this.prepare(`
            UPDATE ${this.tableName}
            SET ${prop} = ?
            WHERE idx = ${this.idx}
        `).run(value.idx);
    }

    delete() {
        for (const key of Object.keys(this.$model)) {
            if (Array.isArray(this.$model[key])) {
                const childModel = this.$model[key];
                const childTableName = childModel?.$table ? `${this.$tableName}_${childModel.$table}` : `${this.$tableName}_${key}`
                this.$prepare(`
                    DELETE FROM ${childTableName} WHERE ridx = ?
                `).run(this.idx);
            }
        }

        this.aClass.$cleanup(this);

        return this.$prepare(`
            DELETE FROM ${this.$tableName} WHERE idx = ?
        `).run(this.idx);        
    }

    prepare(sql) {
        return this.aClass.factory.prepare(sql);
    }
}
