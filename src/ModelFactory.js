import sqlite3 from "better-sqlite3";

/**
 * This class is responsible for creating and managing database tables and their corresponding models. 
 * This class is a factory that generates classes whcih in turn use a proxy to update the tables on 
 * write and store values for future reads.
 */
class ModelFactory {

    /**
     * The ModelFactory class has a constructor that takes a database file name and some SQL options. 
     * The database file name is mandatory, but the SQL options are optional.
     */
    constructor(dbFile, sqlOptions = {}) {
        this.dbFile = dbFile;
        this.sqlOptions = sqlOptions;
    }

    /**
     * The prepare() method is used interanally to prepare an SQL statement it for execution
     * using the options passed into the constructor.
     */
    __prepare(stmt) {
        try {
            return new sqlite3(this.dbFile, this.sqlOptions).prepare(stmt);
        } catch (error) {
            console.log(stmt);
            throw error;
        }
    }

    /**
     * Create a new class controller for an underlying table.
     * This method will create a new table based on the class name if one does
     * not already exist.  If a table does already exist but doesn't match the
     * schema outlined in 'model' future operations may fail.
     */
    createClass(model, aClass) {
        this.__createObjectTable(model, aClass.name);
        return new Proxy(aClass.constructor, new ClassHandler(this, aClass, model));
    }

    /**
     * Used internally to create the tables used by the proxies.
     */
    __createTable(model, table, fields) {
        for (const key of Object.keys(model)) {
            if (typeof model[key] === "string") {
                fields.push(`${key} ${model[key]}`)
            }
            else if (typeof model[key] === "object") {
                const childTable = `${table}_${key}`;
                const childModel = model[key];
                this.__createArrayTable(childModel, childTable);
            }
        }

        this.__prepare(`
            CREATE TABLE IF NOT EXISTS ${table} (
                ${fields.join()}
            )`).run();
    }

    /**
     * Used internally to crate a table for the root object.
     */
    __createObjectTable(model, table) {
        const fields = ['idx INTEGER PRIMARY KEY AUTOINCREMENT'];
        this.__createTable(model, table, fields);
    }

    /**
     * Used internally to crate a tables for array parameters.
     */
    __createArrayTable(model, table) {
        const fields = [
            'idx VARCHAR(32) PRIMARY KEY',
            'root_idx INTEGER'
        ];
        this.__createTable(model, table, fields);
    }
}

/**
 * Handles the creation and loading of instances of the generated classes.
 */
class ClassHandler {
    constructor(factory, aClass, model) {
        this.factory = factory;
        this.table = aClass.name;
        this.model = model;
        this.aClass = aClass;
    }

    /**
     * Load a previously constructed instance from storage.
     */
    load(idx) {
        const data = this.factory.__prepare(`
            SELECT * FROM ${this.table}
            WHERE idx = ?
        `).get(idx);

        if (!data) throw new Error(`Unknown object index ${idx}`);

        for (const key of Object.keys(this.model)) {
            if (typeof this.model[key] === "object") {
                const childTable = `${this.table}_${key}`;
                const array = this.loadArray(idx, childTable);

                const ahnd = new ArrayInstanceHandler(this.factory, idx, childTable, this.model[key]);
                data[key] = new Proxy(array, ahnd);
            }
        }

        return new Proxy(new this.aClass(), new InstanceHandler(this.factory, idx, this.table, this.model, data));
    }

    /**
     * Load an array with records from a table.
     */
    loadArray(rootIdx, table) {
        const array = [];

        const all = this.factory.__prepare(`
            SELECT * FROM ${table}
            WHERE root_idx = ?
        `).all(rootIdx);

        for (const row of all) {
            const localIdx = row.idx;
            delete row.idx;
            delete row.root_idx;
            array[localIdx] = row;
        }
        return array;
    }

    /**
     * Constructs a new instance by either loading an existing one or creating a new one and storing 
     * its data in the table.  To create a new instance pass in an object with key-values corresponding
     * to the table schema.  To load data stored in the db, pass in an integer that matches the instance
     * index.
     */
    construct(target, args, newTarget) {
        if (typeof args[0] === "number") return this.load(args[0]);
        const divided = divideObject(args[0]);

        this.idx = this.factory.__prepare(`
            INSERT INTO ${this.table}
            (${divided.keys.join()})
            VALUES (${divided.placeHolders})
        `).run(divided.values).lastInsertRowid;

        return this.load(this.idx);
    }

    get(target, prop) {
        console.log("get", prop, this);
        console.log("prop.substring", this[prop.substring(1)]);

        if (prop.charAt(0) === "$") {
            const field = this[prop.substring(1)];
            if (typeof field === "function") {
                return this[prop.substring(1)].bind(this);
            } else {
                return this[prop.substring(1)];
            }
        }
        if (this.model[prop]) return this.data[prop];
        return Reflect.get(...arguments);
    }

    /**
     * Retrieve an array of indices.
     * Use $dir to call.
     */
    dir() {
        const all = this.factory.__prepare(`
            SELECT idx FROM ${this.table}
        `).all();
        return all.map(i => i.idx);
    }

    /**
     * Retrieve an array of all rows.
     * Use $all to call.
     */    
    all() {
        return this.factory.__prepare(`
            SELECT * FROM ${this.table}
        `).all();
    }

    /**
     * Drop the associated table.
     * Use $drop to call.
     */    
    drop() {
        return this.factory.__prepare(`
            DROP TABLE ${this.table}
        `).run();
    }
}

/**
 * Handles the storage and retrieval of instanced data.
 */
class InstanceHandler {
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
                console.log("meta prop", prop);
                return this[prop.substring(1)];
            }
        }
        if (this.model[prop]) return this.data[prop];
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
        console.log(`delete ${this.idx}`);
        return this.factory.__prepare(`
            DELETE FROM ${this.table} WHERE idx = ?
        `).run(this.idx);
    }
}

/**
 * Handles the storage and retrieval of instanced array data.
 */
class ArrayInstanceHandler extends InstanceHandler {
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
        console.log(target);
        console.log(this.table);

        if (prop in target) {
            delete target[prop];
            this.factory.__prepare(`
                DELETE FROM ${this.table} WHERE idx = ?
            `).run(prop);
            return true;
        }
    }
}

/**
 * Takes an object and divides it into keys, values, and placeholders for use in SQL statements.
 */
function divideObject(object) {
    const divided = {
        keys: [],
        values: []
    }

    for (const key of Object.keys(object)) {
        divided.keys.push(key);
        divided.values.push(object[key]);
    }

    divided.placeHolders = new Array(divided.keys.length).fill("?").join();
    return divided;
}

export default ModelFactory;