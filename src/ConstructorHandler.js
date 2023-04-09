import { InstanceHandler } from "./InstanceHandler.js";
import { ArrayInstanceHandler } from "./ArrayInstanceHandler.js";
import { divideObject } from "./divideObject.js";

/**
 * Handles the creation and loading of instances of the generated classes.
 */
export class ConstructorHandler {
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

        if (!data)
            throw new Error(`Unknown object index ${idx}`);

        for (const key of Object.keys(this.model)) {
            if (typeof this.model[key] === "object") {
                const childTable = `${this.table}_${key}`;
                const array = this.loadArray(idx, childTable);

                const ahnd = new ArrayInstanceHandler(this.factory, idx, childTable, this.model[key]);
                data[key] = new Proxy(array, ahnd);
            }
        }

        return new Proxy(new this.aClass(data), new InstanceHandler(this.factory, idx, this.table, this.model, data));
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
     * its data in the db table.  To create a new instance pass in an object with key-values corresponding
     * to the table schema.  To load data stored in the db, pass in an integer that matches the instance
     * index.
     */
    construct(target, args, newTarget) {
        if (typeof args[0] === "number")
            return this.load(args[0]);
        if (typeof args[0] === "string")
            return this.load(parseInt(args[0]));

        const divided = divideObject(args[0]);

        this.idx = this.factory.__prepare(`
            INSERT INTO ${this.table}
            (${divided.keys.join()})
            VALUES (${divided.placeHolders})
        `).run(divided.values).lastInsertRowid;

        return this.load(this.idx);
    }

    get(target, prop) {
        if (prop.charAt(0) === "$") {
            const field = this[prop.substring(1)];
            if (typeof field === "function") {
                return this[prop.substring(1)].bind(this);
            } else {
                return this[prop.substring(1)];
            }
        }

        if (this.model[prop]) {
            return this.data[prop];
        }

        return Reflect.get(this.aClass, prop);
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

    createTables(dbFile, sqlOptions) {
        this.factory.setup(dbFile, sqlOptions)
        this.factory.__createObjectTable(this.model, this.aClass.name);
    }
}
