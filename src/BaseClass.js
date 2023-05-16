import divideObject from "./divideObject.js";
import ArrayInstanceHandler from "./ArrayInstanceHandler.js";
import InstanceHandler from "./InstanceHandler.js";
import sqlifyList from "./sqlifyList.js";
import { extractClass, hasReference } from "./extractClass.js";

export default class BaseClass {
    constructor(...args) {
        if (!args[0] || Object.keys(args[0]).length === 0) {
            // no-arg or args[0] == {}
            this._constructDefault();
            return this.constructor._doProxy(this, this.idx);
        } else {
            const deferred = this._constructFromData(args[0]);
            const proxy = this.constructor._doProxy(this, this.idx);
            processDeferred(this.constructor.factory, deferred, proxy);
            return proxy;
        }
    }

    static get tablename() {
        return this.model.$tablename;
    }

    /**
     * Construct a new instance based upon default values for the DB table.
     */
    _constructDefault() {
        this.idx = this.constructor.factory.prepare(
            `INSERT INTO ${this.constructor.tablename} DEFAULT VALUES`
        ).run().lastInsertRowid;
    }

    /**
     * Construct a new instance based upon source values.
     */
    _constructFromData(source) {
        // Build a list of fields from the source
        const list = listify(source, this.constructor.model);
        const { notDeferred, deferred } = extractDeferred(list);
        const seek = seekReflected(notDeferred, this.constructor.factory);

        if (seek.length === 0) {
            this._constructDefault();
        } else {
            // Insert each value from 'source' into the DB
            const div = sqlifyList(seek);

            this.idx = this.constructor.factory.prepare(`
                INSERT INTO ${this.constructor.tablename}
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
            SELECT * FROM  ${this.tablename} WHERE ${div.where}
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
                SELECT * FROM  ${this.tablename}
            `).all().map(row => this.get(row.idx));
        } else {
            const div = divideObject(conditions);
            return this.factory.prepare(`
                SELECT * FROM  ${this.tablename} WHERE ${div.where}
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
            SELECT * FROM  ${this.tablename} WHERE idx = ?
        `).get(idx);
        
        const hnd = new InstanceHandler(
            row.idx,
            this.tablename,
            this.model,
            this
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

        for (const key of Object.keys(this.model)) {
            if (key.startsWith("$")) continue;
            if (Array.isArray(this.model[key])) {
                const childTableName = `${this.tablename}_${key}`;
                const array = this._loadArray(idx, childTableName, this.model[key]);
                const instanceClass = this.factory.getClass(this.model[key]);

                const ahnd = new ArrayInstanceHandler(
                    idx,
                    childTableName,
                    this.model[key],
                    instanceClass,
                );

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

/**
 * Create a list of key-value pairs of the object's fields.
 * Only fields that are specified on the model are included.
 * Fields not found on the model are ignored.
 */
function listify(target, model) {
    console.log("listify ***************");
    const list = [];
    for (const key of Object.keys(target)) {
        const value = target[key];
        console.log(key, model[key]);
        if (!model[key]) continue;
        list.push({ key: key, value: value, model: model[key] });
    }
    console.log(list);
    return list;
}

/**
 * Remove values from any array fields and return them in a seperate deferred array.
 * These need to be built after the object because the root index needs to be known.
 * See: #processDeferred
 */
function extractDeferred(list) {
    const notDeferred = [];
    const deferred = [];

    for (const i in list) {
        const data = list[i];

        if (Array.isArray(data.value)) {
            for (const i in data.value) {
                deferred.push({
                    key: data.key,
                    value: data.value[i],
                    model: data.model[0],
                    index: i,
                    type: 'array'
                });
            }
        }
        else if (data.model.startsWith("@_t")) {
            deferred.push({ ...data, ...{ type: 'field' } });
        }
        else {
            notDeferred.push(data);
        }
    }

    return { notDeferred, deferred };
}

/**
 * Replace reflected objects in the list with their index value.
 */
function seekReflected(list, factory) {
    const next = [];

    for (const data of list) {
        if (typeof data.value !== "object" || data.value === null || data.value === undefined) {
            next.push(data);
            continue;
        }

        const className = data.model.$classname;

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