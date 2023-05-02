import divideObject from "./divideObject.js";
import ArrayInstanceHandler from "./ArrayInstanceHandler.js";
import InstanceHandler from "./InstanceHandler.js";
import validateColumnNames from "./validateColumnNames.js";
import { extractReference, hasReference } from "./extractReference.js";

class ClassFactoryError extends Error {
    constructor(index) {
        super(`Unknown index ${index}`);
    }
}

export default function classFactory(factory, tableName, model) {
    return class {
        static factory = factory;
        static tableName = tableName;
        static instantiated = new Map();
        static model = model;

        constructor(...args) {
            if (typeof args[0] === "number") {
                this.idx = args[0];
                if (this.constructor.instantiated.has(this.idx)) return this.constructor.instantiated.get(this.idx);
            } else {
                const div = divideObject(args[0] ?? {}, this.constructor.model);

                if (!args[0]) {
                    this.idx = this.constructor.factory.prepare(
                        `INSERT INTO ${this.constructor.tableName} DEFAULT VALUES`
                    ).run().lastInsertRowid;
                } else {
                    this.idx = this.constructor.factory.prepare(`
                        INSERT INTO ${this.constructor.tableName}
                        (${div.keys})
                        VALUES (${div.placeHolders})
                    `).run(div.values).lastInsertRowid;
                }
            }

            const row = this.constructor.factory.prepare(`
                SELECT * FROM  ${this.constructor.tableName} WHERE idx = ?
            `).get(this.idx);

            if (!row) throw new ClassFactoryError(this.idx);

            return this.constructor._doProxy(row, this);
        }

        /**
        * Create all tables.
        */
        static createTables() {
            return this._createObjectTable(this.model, this.tableName);
        }

        /**
        * Used internally to create the object tables used by the proxies.
        */
        static _createObjectTable(model, tableName) {
            this._createTable(
                model,
                tableName,
                [`idx INTEGER PRIMARY KEY AUTOINCREMENT`]
            );
        }

        /**
        * Used internally to create the tables used by the proxies.
        */
        static _createTable(model, tableName, fields = [], append = []) {
            for (const key of Object.keys(model)) {
                if (key === "$append") {
                    for (const v of model[key]) fields.push(v);
                }
                else if (hasReference(model[key])) {
                    const extract = extractReference(key, model[key]);
                    fields.push(`${key} ${extract.column}`);
                    append.push(extract.foreignKey);
                }
                else if (Array.isArray(model[key])) {
                    let arrayModel = model[key][0];
                    let arrayTableName = `${tableName}_${key}`;

                    if (typeof (arrayModel) === "string") arrayModel = {};

                    this._createArrayTable(arrayModel, arrayTableName, tableName);
                }
                else if (typeof model[key] === "string" && key[0] !== '$') {
                    fields.push(`${key} ${model[key]}`);
                }
            }

            const lines = [...fields, ...append].join(",\n\t");

            const statement = this.factory.prepare(`CREATE TABLE IF NOT EXISTS ${tableName}(\n\t${lines}\n)`);
            statement.run();
            return statement;
        }

        /**
         * Used internally to create the array tables used by the proxies.
         */
        static _createArrayTable(model, tableName, rootTable) {
            this._createTable(
                model,
                tableName,
                [
                    `aidx VARCHAR(64)`, // array index (in js object)
                    `ridx INTEGER`,     // parent/root index (what is referring)
                    `oidx INTEGER`,     // object index (what is referred to)
                ],
                [`FOREIGN KEY (ridx) REFERENCES ${rootTable} (idx)`]
            );
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
            if (typeof conditions === "number") conditions = { idx: conditions };

            const div = divideObject(conditions);
            validateColumnNames(this.model, div.keys);

            const row = this.factory.prepare(`
                SELECT * FROM  ${this.tableName} WHERE ${div.where}
            `).get(div.values);

            if (!row) return undefined;

            if (this.instantiated.has(row.idx)) {
                return this.instantiated.get(row.idx);
            }
            
            return this._doProxy(row, Object.create(this.prototype));

            // return new this.prototype.constructor(row.idx);
        }

        /**
         * Retrieve zero or more objects from the DB as an array.
         * If there is no associated DB entries returns a zero length array.
         * 
         * Conditions can either be an integer or an object.  If it's an integer retrieves by
         * 'idx', otherwise the key-values of the object are used.  It retrieves objects where
         * the column-values of the DB match exactly the key-values of the conditions object.
         * 
         * @param {Integer | Object} conditions - Selector for which row to retrieve.
         */
        static all(conditions) {
            if (typeof conditions === "number") conditions = { idx: conditions };

            if (!conditions) {
                return this.factory.prepare(`
                    SELECT * FROM  ${this.tableName}
                `).all().map(row => this.get(row.idx));
            } else {
                const div = divideObject(conditions);
                validateColumnNames(this.model, div.keys);
                return this.factory.prepare(`
                    SELECT * FROM  ${this.tableName} WHERE ${div.where}
                `).all(div.values).map(row => this.get(row.idx));
            }
        }

        /**
         * Used internally to track created proxy objects.
         * Returns the stored object if the index (row.idx) has been used previously.
         * Otherwise, returns a new object.
         */
        static _doProxy(row, target) {
            Object.assign(target, row);
            Object.assign(target, this._arrayify(row.idx));
            Object.assign(target, this._deReference(row));

            const hnd = new InstanceHandler(this.factory, row.idx, this.tableName, this.model, this.instantiated);
            this.instantiated.set(target.idx, new Proxy(target, hnd));
            return this.instantiated.get(row.idx);
        }

        /**
        * Assign an array instance handler to all array fields.
        */
        static _arrayify(idx) {
            const data = {};

            for (const key of Object.keys(this.model)) {
                if (key.startsWith("$")) continue;
                if (Array.isArray(this.model[key])) {
                    const childModel = this.model[key];
                    const childTableName = `${this.tableName}_${key}`;
                    const array = this._loadArray(idx, childTableName);

                    const ahnd = new ArrayInstanceHandler(this.factory, idx, childTableName, this.model[key], this.instantiated);
                    data[key] = new Proxy(array, ahnd);
                }
            }

            return data;
        }

        /**
         * For each key in the model:
         *   If the column descriptor is a foreign reference AND the row has a value for that key
         *     Instatiate the foreign object from the database and assign it to the POJO (data).
         */
        static _deReference(row) {
            const data = {};

            for (const key of Object.keys(this.model)) {
                if (hasReference(this.model[key]) && row[key]) {
                    const extract = extractReference(key, this.model[key]);
                    const aClass = this.factory.classes[extract.className];
                    if (!aClass) throw new Error(`Unknown class reference: ${extract.className}`);
                    data[key] = aClass.get(row[key]);
                }
            }

            return data;
        }

        /**
         * Load array data from DB to object.
         * Retrieves all data from the child talbe that matches the root object's index value.
         * @param {Integer} ridx - The index of parent (root) object.
         * @param {String} childTableName - The name of the child table.
         */
        static _loadArray(ridx, childTableName) {
            const array = [];

            const all = this.factory.prepare(`
                SELECT * FROM ${childTableName} WHERE ridx = ?
            `).all(ridx);

            for (const row of all) {
                array[row.aidx] = row;
                this._arrayify(row.idx);
            }
            return array;
        }
    }
}