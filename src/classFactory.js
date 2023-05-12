import sqlifyList from "./sqlifyList.js";
import divideObject from "./divideObject.js";
import ArrayInstanceHandler from "./ArrayInstanceHandler.js";
import InstanceHandler from "./InstanceHandler.js";
import { extractClass, hasReference, classNameFromModel } from "./extractClass.js";
import ReflectedBaseClass from "./ReflectedBaseClass.js";

/**
 * Replace reflected objects in the list with their index value.
 */
function seekReflected(list, factory) {
    const next = [];

    for (const data of list) {
        if (typeof data.value !== "object") {
            next.push(data);
            continue;
        }


        const className = classNameFromModel(data.model);

        if (factory.isReflected(data.value)) {
            next.push({ key: data.key, value: data.value.idx, model: data.model });
        }
        else {
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

function processDeferred(factory, deferred, target) {
    for (const data of deferred) {
        if (data.type === "field") {
            target[data.key] = { ...data.value, ...{ ridx: target.idx } };
        }
        else if (data.type === "array") {
            target[data.key][data.index] = { ...data.value, ...{ ridx: target.idx } };
        }
    }
}

export default function classFactory(factory, name, model) {
    return class extends ReflectedBaseClass {
        static factory = factory;
        static instantiated = new Map();
        static model = model;
        static name = name;
    }

    return class {
        static factory = factory;
        static instantiated = new Map();
        static model = model;
        static name = name;

        constructor(...args) {
            let deferred = [];
            if (!args[0] || Object.keys(args[0]).length === 0) {
                // no-arg or args[0] == {}
                this._constructDefault();
            } else {
                deferred = this._constructFromData(args[0]);
            }

            const proxy = this.constructor._doProxy(this, this.idx);
            processDeferred(this.constructor.factory, deferred, proxy);
            return proxy;
        }

        static get tableName() {
            return this.model.$classname.toLowerCase();
        }

        _constructDefault() {
            this.idx = this.constructor.factory.prepare(
                `INSERT INTO ${this.constructor.tableName} DEFAULT VALUES`
            ).run().lastInsertRowid;
        }

        _constructFromData(source) {
            const list = listify(source, this.constructor.model);
            const { notDeferred, deferred } = extractDeferred(list);
            const seek = seekReflected(notDeferred, this.constructor.factory);

            if (seek.length === 0) {
                this._constructDefault();
            } else {
                const div = sqlifyList(seek);
                this.idx = this.constructor.factory.prepare(`
                INSERT INTO ${this.constructor.tableName}
                (${div.keys})
                VALUES (${div.placeHolders})
            `).run(div.values).lastInsertRowid;
            }
            return deferred;
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
            if (this.factory.isReflected(conditions)) {
                return this.instantiated.get(conditions.idx);
            }

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

            const hnd = new InstanceHandler(
                this.factory,
                row.idx,
                this.tableName,
                this.model,
                this.instantiated,
                this.constructor
            );
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

            for (const field of Object.keys(model)) {
                if (model[field].isArray) {
                    console.log("key " + model[field]);

                    console.log(field, field.indexTable);
                    const array = this._loadArray(idx,  field.indexTable, this.model[field]);

                    const ahnd = new ArrayInstanceHandler({
                        factory: this.factory,
                        idx: idx,
                        tableName: model[field].tableName,
                        model: model[field].deRef,
                        map: this.instantiated,
                        constructor: this.factory.getClass(this.model[field])
                    });

                    data[field] = new Proxy(array, ahnd);
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
         * Retreives all data from 'table' that matches root object 'rootIDX'.
         * Retrieves all data from the child table that matches the root object's index value.
         * @param {Integer} rootIDX - The index of parent (root) object.
         * @param {String} childTableName - The name of the child table.
         */
        static _loadArray(rootIDX, childTableName, arrayModel) {
            const array = [];
            const aClass = this.factory.classes[arrayModel.$classname];

            const all = this.factory.prepare(`
                SELECT * FROM ${childTableName} WHERE ridx = ?
            `).all(rootIDX);

            for (const row of all) {
                array[row.aidx] = aClass.get(row.oidx);
            }

            return array;
        }
    }
}