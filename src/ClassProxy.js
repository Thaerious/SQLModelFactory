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
     * Iterate the model adding handlers on all foreign keys.
     */
    _arrayify(row) {
        const data = {};

        for (const key of Object.keys(this.model)) {
            if (Array.isArray(this.model[key])) {
                const childModel = this.model[key];
                const childTableName = childModel?.$table ? `${this.tableName}_${childModel.$table}` : `${this.tableName}_${key}`
                const array = this._loadArray(row.idx, childTableName);
        
                const ahnd = new ArrayInstanceHandler(this.factory, row.idx, childTableName, this.model[key]);
                data[key] = new Proxy(array, ahnd);
            }
        }

        return data;       
    }

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

    _loadArray(rootIdx, table) {
        const array = [];
        
        const all = this.factory.prepare(`
            SELECT * FROM ${table} WHERE ridx = ?
        `).all(rootIdx);

        for (const row of all) {
            array[row.idx] = row;
            this._arrayify(row);
        }
        return array;
    }   

    _proxyIf(row) {
        if (this.instatiated.has(row.idx)) return this.instatiated.get(row.idx);

        const data = {
            ...row,
            ...this._arrayify(row),
            ...this._deReference(row),
        };        

        const hnd = new InstanceHandler(this.factory, row.idx, this.tableName, this.model);
        this.instatiated.set(data.idx, new Proxy(data, hnd));
        return this.instatiated.get(row.idx);        
    }

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
     * Use $dir to call.
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
     * Use $drop to call.
     */
    $drop() {
        return this.factory.prepare(`
            DROP TABLE ${this.tableName}
        `).run();
    }

    /**
     * Create the tables and/or set the table names.
     * Use $createTables to call.
     */
    $createTables(dbFile, sqlOptions) {
        return this._createObjectTable(this.model, this.tableName);
    }

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

    _createObjectTable(model, tableName) {
        this._createTable(
            model,
            tableName,
            [`idx INTEGER PRIMARY KEY AUTOINCREMENT`]
        );
    }
}