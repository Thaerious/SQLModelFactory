import ProxyBase from "./ProxyBase.js";
import divideObject from "./divideObject.js";
import validateColumnNames from "./validateColumnNames.js";
import ArrayInstanceHandler from "./ArrayInstanceHandler.js";
import InstanceHandler from "./InstanceHandler.js";

export default function extend(factory, tableName, instantiated, model) {
    return class extends ProxyBase {
        static factory = factory;
        static tableName = tableName;
        static instantiated = instantiated;
        static model = model;

        constructor(data) {
            super(factory, tableName, model, instantiated, data);
            return this.constructor.get(this.idx);
        }

        /**
         * Retrieve a single object from the DB.
         * If there is no associated DB entry returns 'undefined'.
         * 
         * Conditions can either be an integer or an object.  If it's an integer retrieves by
         * 'idx', otherwise the key-values of the object are used.  It retrieves objects where
         * the column-values of the DB match exactly the key-values of the conditions object.
         * 
         * @param {Integer | Object} conditions - Selector for which row to retrieve.
         */
        static get(conditions) {
            if (typeof conditions === "number") {
                const idx = conditions;
                if (this.instantiated.has(idx)) return this.instantiated.get(idx);
                conditions = { idx: idx };
            }

            const div = divideObject(conditions);
            validateColumnNames(this.model, div.keys);

            const row = this.factory.prepare(`
                SELECT * FROM  ${this.tableName} WHERE ${div.where}
            `).get(div.values);

            if (!row) return undefined;
            return this._proxyIf(this, row);
        };

        /**
         * Used internally to track created proxy objects.
         * Returns the stored object if the index (row.idx) has been used previously.
         * Otherwise, returns a new object.
         */
        static _proxyIf(target, row) {
            if (this.instantiated.has(row.idx)) return this.instantiated.get(row.idx);

            const data = {
                ...row,
                ...this._arrayify(row.idx),
                ...this._deReference(row),
            };

            const hnd = new InstanceHandler(this.factory, row.idx, this.tableName, this.instantiated, this.model);
            this.instantiated.set(data.idx, new Proxy(target, hnd));
            return this.instantiated.get(row.idx);
        }

        /**
            * Assign an array instance handler to all array fields.
            */
        static _arrayify(idx) {
            const data = {};

            for (const key of Object.keys(this.model)) {
                if (Array.isArray(this.model[key])) {
                    const childModel = this.model[key];
                    const childTableName = childModel?.$table ? `${this.tableName}_${childModel.$table}` : `${this.tableName}_${key}`
                    const array = this._loadArray(idx, childTableName);

                    const ahnd = new ArrayInstanceHandler(this, idx, childTableName, this.instantiated, this.model[key]);
                    data[key] = new Proxy(array, ahnd);
                }
            }

            return data;
        }

        /**
         * Fills all referenced fields with an instatiated object.
         */
        static _deReference(row) {
            const data = {};

            for (const key of Object.keys(this.model)) {
                if (this.model[key][0] === '@' && row[key]) {
                    const className = this.model[key].substring(1);
                    const aClass = this.factory.classes[className];
                    data[key] = aClass.$get(row[key]);
                }
            }

            return data;
        }
    }
}
