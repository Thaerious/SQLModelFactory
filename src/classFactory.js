import sqlifyList from "./sqlifyList.js";
import divideObject from "./divideObject.js";
import ArrayInstanceHandler from "./ArrayInstanceHandler.js";
import InstanceHandler from "./InstanceHandler.js";
import { extractClass, hasReference, classNameFromModel } from "./extractClass.js";

/**
 * Create a list of key-value pairs from object for which the model has a matching key.
 * Keys not in the model are ignored.
 */
function listify(object, model) {
    const list = [];
    for (const key of Object.keys(object)) {
        const value = object[key];
        if (!model[key]) continue;
        list.push({ key: key, value: value, model: model[key] });
    }
    return list;
}

/**
 * Remove values from any array fields and return them in a seperate array.
 * These need to be built after the object because the root index is needed to store them.
 * See: #processDeferred
 */
function extractArrays(list) {
    const noArray = [];
    const deferred = [];

    for (const i in list) {
        const data = list[i];
        if (Array.isArray(data.value)) {
            for (const i in data.value) {
                deferred.push({
                    key: data.key,
                    value: data.value[i],
                    model: data.model[0],
                    index: i
                });
            }
        } else {
            noArray.push(data);
        }
    }

    return { noArray, deferred };
}

/**
 * Replace reflected objects with their index value.
 */
function seekReflected(list, factory) {
    const next = [];

    for (const data of list) {
        if (typeof data.value !== "object") {
            next.push(data);
            continue;
        }

        const className = classNameFromModel(data.model);
        if (factory.isReflective(data.value)) {
            next.push({ key: data.key, value: data.value.idx, model: data.model });
        } else {
            try {
                const instance = new factory.classes[className](data.value);
                next.push({ key: data.key, value: instance.idx, model: data.model });
            } catch (error) {
                throw new Error(`${error.message}\nclassName: '${className}'`, error);
            }
        }
    }

    return next;
}

function processDeferred(deferred, target) {
    for (const item of deferred) {
        target[item.key][item.index] = item.value;
    }
}

export default function classFactory(factory, name, model) {
    return class {
        static factory = factory;
        static tableName = name.toLowerCase();
        static instantiated = new Map();
        static model = model;
        static name = name;

        constructor(...args) {
            if (!args[0] || Object.keys(args[0]).length === 0) {
                this.idx = this.constructor.factory.prepare(
                    `INSERT INTO ${this.constructor.tableName} DEFAULT VALUES`
                ).run().lastInsertRowid;
            } else {
                return this._constructFromData(args[0]);
            }
        }

        _constructFromData(source) {
            const list = listify(source, this.constructor.model);
            const { noArray, deferred } = extractArrays(list);
            const seek = seekReflected(noArray, this.constructor.factory);
            const div = sqlifyList(seek);

            this.idx = this.constructor.factory.prepare(`
                INSERT INTO ${this.constructor.tableName}
                (${div.keys})
                VALUES (${div.placeHolders})
            `).run(div.values).lastInsertRowid;

            const proxy = this.constructor._doProxy(this, this.idx);
            processDeferred(deferred, proxy);

            return proxy;
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
                    const extract = extractClass(key, model[key]);
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
            if (typeof conditions === "number") {
                return this.getByIdx(conditions);
            }

            const div = divideObject(conditions);            
            const row = this.factory.prepare(`
                SELECT * FROM  ${this.tableName} WHERE ${div.where}
            `).get(div.values);

            if (!row) return undefined;

            if (this.instantiated.has(row.idx)) {
                return this.instantiated.get(row.idx);
            }

            return this._doProxy(Object.create(this.prototype), row.idx);
        }

        static getByIdx(idx) {
            if (this.instantiated.has(idx)) {
                return this.instantiated.get(idx);
            } else {
                return this.get({ idx: idx });
            }
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
        static _doProxy(target, idx) {
            const row = this.factory.prepare(`
                SELECT * FROM  ${this.tableName} WHERE idx = ?
            `).get(idx);

            const hnd = new InstanceHandler(this.factory, row.idx, this.tableName, this.model, this.instantiated);
            this.instantiated.set(idx, new Proxy(target, hnd));

            Object.assign(target, row);
            Object.assign(target, this._arrayify(row.idx));
            Object.assign(target, this._deReference(row));

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
                    const childTableName = `${this.tableName}_${key}`;
                    const array = this._loadArray(idx, childTableName, this.model[key]);

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
                    const aClass = this.factory.getClass(this.model[key]);
                    if (!aClass) throw new TypeError(`unknown class ${this.model[key]}`);
                    data[key] = aClass.get(row[key]);
                }
            }

            return data;
        }

        /**
         * Load array data from DB to object.
         * Retrieves all data from the child table that matches the root object's index value.
         * @param {Integer} rootIdx - The index of parent (root) object.
         * @param {String} childTableName - The name of the child table.
         */
        static _loadArray(rootIdx, childTableName, arrayModel) {
            const array = [];

            const aClass = this.factory.getClass(arrayModel);

            const all = this.factory.prepare(`
                SELECT * FROM ${childTableName} WHERE ridx = ?
            `).all(rootIdx);

            for (const row of all) {
                array[row.aidx] = aClass.get(row.oidx);
            }

            return array;
        }
    }
}