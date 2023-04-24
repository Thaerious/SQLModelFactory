import InstanceHandler from "./InstanceHandler.js";
import ArrayInstanceHandler from "./ArrayInstanceHandler.js";
import divideObject from "./divideObject.js";
import validateColumnNames from "./validateColumnNames.js";

/**
 * Handles the storage and retrieval of instanced data.
 */
export default class ProxyBase {
    constructor(factory, tableName, model, instantiated, data) {
        if (!factory) throw new Error(`Invalid argument: factory`);
        if (!tableName) throw new Error(`Invalid argument: tableName`);
        if (!model) throw new Error(`Invalid argument: model`);
        if (!instantiated) throw new Error(`Invalid argument: map`);

        const div = divideObject(data ?? {});
        this.instantiated = instantiated;

        if (!data) {
            this.idx = factory.prepare(
                `INSERT INTO ${tableName} DEFAULT VALUES`
            ).run().lastInsertRowid;
        } else {
            this.idx = factory.prepare(`
                INSERT INTO ${tableName}
                (${div.keys})
                VALUES (${div.placeHolders})
            `).run(div.values).lastInsertRowid;
        }

        // return ProxyBase.get(this.idx);
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
            array[row.idx] = row;
            this._arrayify(row.idx);
        }
        return array;
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

        const div = divideObject(conditions);
        validateColumnNames(this.model, div.keys);

        const all = this.factory.prepare(`
        SELECT * FROM  ${this.tableName} WHERE ${div.where}
    `).all(div.values);

        return all.map(row => this._proxyIf(row));
    }

    /**
     * Retrieve an array of indices.
     * 
     * Conditions can either be an integer or an object.  If it's an integer retrieves by
     * 'idx', otherwise the key-values of the object are used.  It retrieves objects where
     * the column-values of the DB match exactly the key-values of the conditions object.
     */
    static dir(conditions) {
        if (!conditions) {
            return this.factory.prepare(`
            SELECT idx FROM ${this.tableName}
        `).all().map(i => i.idx);
        } else {
            const div = divideObject(conditions);
            return this.factory.prepare(`
            SELECT idx FROM ${this.tableName} WHERE ${div.where}              
        `).all(div.values).map(i => i.idx);
        }
    }

    /**
     * Drop the associated table.
     */
    static drop() {
        return this.factory.prepare(`
        DROP TABLE ${this.tableName}
    `).run();
    }

    /**
     * Create all tables.
     */
    static createTables() {
        return this._createObjectTable(this.model, this.tableName);
    }

    /**
     * Create a prepare statement from the provided sql string using the db file
     * specified in the constructor.
     * 
     * @param {String} sql - SQL string used for the prepare call.
     */
    static prepare(sql) {
        return this.factory.prepare(sql);
    }

    /**
     * Used internally to create the tables used by the proxies.
     */
    static _createTable(model, tableName, fields = [], append = []) {
        for (const key of Object.keys(model)) {
            if (key === "$append") {
                for (const v of model[key]) fields.push(v);
            }
            else if (model[key][0] === '@') {
                const foreignName = model[key].substring(1).toLowerCase();
                fields.push(`${key} Integer`);
                append.push(`FOREIGN KEY (${key}) REFERENCES ${foreignName} (idx)`);
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

        const statement = this.prepare(`CREATE TABLE IF NOT EXISTS ${tableName}(\n\t${lines}\n)`);
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
                `ridx Integer`,     // parent/root index (what is referring)
                `oidx Integer`,     // object index (what is referred to)
            ],
            [`FOREIGN KEY (ridx) REFERENCES ${rootTable} (idx)`]
        );
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
}