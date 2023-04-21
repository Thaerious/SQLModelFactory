import { InstanceHandler } from "./InstanceHandler.js";
import { ArrayInstanceHandler } from "./ArrayInstanceHandler.js";
import divideObject from "./divideObject.js";
import { validateColumnNames } from "./validateColumnNames.js";

export default class ClassProxy {
    constructor(factory, tableName, model) {
        this.factory = factory;
        this.tableName = tableName?.toLowerCase();
        this.model = model;
        this.tablesCreated = false;
        this.instatiated = new Map();
    }

    construct(_, args) {
        const div = divideObject(args[0] ?? {});

        if (!args[0]) {
            this.$idx = this.factory.prepare(
                `INSERT INTO ${this.tableName} DEFAULT VALUES`
            )
            .run()
            .lastInsertRowid;
        } else {
            this.$idx = this.factory.prepare(`
                INSERT INTO ${this.tableName}
                (${div.keys})
                VALUES (${div.placeHolders})
            `).run(div.values).lastInsertRowid;
        }

        return this.$get(this.$idx);
    }

    /**
     * Proxy get handler.
     * If prop is prefixed by $ calls proxy field/method,
     * otherwise calls base field/method.
     */
    get(_, prop) {
        return Reflect.get(this, prop);
    }   

    /**
     * Assign an array instance handler to all array fields.
     */
    _arrayify(idx) {
        const data = {};

        for (const key of Object.keys(this.model)) {
            if (Array.isArray(this.model[key])) {
                const childModel = this.model[key];
                const childTableName = childModel?.$table ? `${this.tableName}_${childModel.$table}` : `${this.tableName}_${key}`
                const array = this._loadArray(idx, childTableName);
        
                const ahnd = new ArrayInstanceHandler(this, idx, childTableName, this.model[key]);
                data[key] = new Proxy(array, ahnd);
            }
        }

        return data;       
    }

    /**
     * Fills all referenced fields with an instatiated object.
     */
    _deReference(row) {
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

    /**
     * Load array data from DB to object.
     * Retrieves all data from the child talbe that matches the root object's index value.
     * @param {Integer} ridx - The index of parent (root) object.
     * @param {String} childTableName - The name of the child table.
     */
    _loadArray(ridx, childTableName) {
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
     * Used internally to track created proxy objects.
     * Returns the stored object if the index (row.idx) has been used previously.
     * Otherwise, returns a new object.
     */
    _proxyIf(row) {
        if (this.instatiated.has(row.idx)) return this.instatiated.get(row.idx);

        const data = {
            ...row,
            ...this._arrayify(row.idx),
            ...this._deReference(row),
        };        

        const hnd = new InstanceHandler(this, row.idx, this.tableName, this.model);
        this.instatiated.set(data.idx, new Proxy(data, hnd));
        return this.instatiated.get(row.idx);        
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
    $get(conditions) {
        if (typeof conditions === "number") {
            const idx = conditions;
            if (this.instatiated.has(idx)) return this.instatiated.get(idx);
            conditions = { idx: idx };
        }

        const div = divideObject(conditions);
        validateColumnNames(this.model, div.keys);

        const row = this.factory.prepare(`
            SELECT * FROM  ${this.tableName} WHERE ${div.where}
        `).get(div.values);

        if (!row) return undefined;        
        return this._proxyIf(row);
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
    $all(conditions) {
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
    $dir(conditions) {
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
    $drop() {
        return this.factory.prepare(`
            DROP TABLE ${this.tableName}
        `).run();
    }

    /**
     * Create all tables.
     */
    $createTables() {
        return this._createObjectTable(this.model, this.tableName);
    }

    /**
     * Create a prepare statement from the provided sql string using the db file
     * specified in the constructor.
     * 
     * @param {String} sql - SQL string used for the prepare call.
     */    
    $prepare(sql) {
        return this.factory.prepare(sql);
    }

    /**
     * Used internally to create the tables used by the proxies.
     */
    _createTable(model, tableName, fields = [], append = []) {
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

        const statement = this.$prepare(`CREATE TABLE IF NOT EXISTS ${tableName}(\n\t${lines}\n)`);
        statement.run();
        return statement;
    }

    /**
     * Used internally to create the array tables used by the proxies.
     */    
    _createArrayTable(model, tableName, rootTable) {
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
    _createObjectTable(model, tableName) {
        this._createTable(
            model,
            tableName,
            [`idx INTEGER PRIMARY KEY AUTOINCREMENT`]
        );
    }

    /**
     * Removes internal references for the given object.
     * Used after deleting the object from the DB.
     */     
    cleanup(object) {
        this.instatiated.delete(object.idx);
    }
}