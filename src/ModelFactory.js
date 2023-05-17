import sqlite3 from "better-sqlite3";
import classFactory from "./classFactory.js";
import Model from "./Model.js";
import createTable from "./createTable.js";

class ModelFactoryError extends Error {
    constructor(cause, expression) {
        super(`${cause.message}\n${expression}`, { cause });
        this.expression = expression;
    }
}

/**
 * This class is responsible for creating and managing database tables and their corresponding models. 
 * This class is a factory that generates classes whcih in turn use a proxy to update the tables on 
 * write and store values for future reads.
 */
class ModelFactory {
    constructor(dbFile, sqlOptions = {}) {
        this._dbFile = dbFile;
        this._sqlOptions = sqlOptions;
        this.models = {};
        this.classes = {};
    }

    static get instance() {
        if (!this._instance) {
            this._instance = new ModelFactory();
        }
        return this._instance;
    }

    set dbFile(value) {
        this.close();
        this._dbFile = value;
    }

    set options(value) {
        this.close();
        this._sqlOptions = value;
    }

    get dbFile() {
        return this._dbFile;
    }

    get options() {
        return { ...this._sqlOptions };
    }

    /**
     * Returns true if 'object' is reflective.
     * Reflective objects are instances of a class created by this factory,
     * and has the 'idx' field.
     */
    isReflected(object) {
        if (!object) return false;
        if (typeof object !== "object") return false;
        if (typeof object.idx === "undefined") return false;

        for (const aClass in this.classes) {
            if (object instanceof this.classes[aClass]) return true;
        }
        return false;
    }

    /**
     * Retrieve a reflective class by name.
     * The name can be a string or a @-prefixed string.
     * If the string is within an array it must be an array of length 1.
     * Returns undefined if no class found.
     */
    getClass(name) {   
        if (Array.isArray(name)) name = name[0];
        if (name.startsWith("@")) name = name.substring(1);
        if (name.startsWith("[]")) name = name.substring(2);
        return this.classes[name];
    }

    getModel(name) {
        if (Array.isArray(name)) name = name[0];
        if (name.startsWith("@")) name = name.substring(1);
        if (name.startsWith("[]")) name = name.substring(2);
        return this.models[name];
    }

    prepare(expression) {
        try {
            if (this.sq3) return this.sq3.prepare(expression);

            this.sq3 = new sqlite3(this._dbFile, this._sqlOptions);
            this.sq3.pragma('journal_mode = WAL');
            this.sq3.pragma('foreign_keys = ON');
            const statement = this.sq3.prepare(expression);
            return statement;
        } catch (error) {
            throw new ModelFactoryError(error, expression);
        }
    }

    close() {
        if (!this.sq3) return;
        this.sq3.close();
        delete this.sq3;
    }

    /**
     * Create a new class controller for an underlying table.
     * This method will create a new table based on the class name if one does
     * not already exist.  If a table does already exist but doesn't match the
     * schema outlined in 'model' future operations may fail.
     */
    createClasses(models) {
        if (models) this.models = new Model(models);

        for (const name in this.models) {
            this.classes[name] = classFactory(this, this.models[name]);
        }
        return this.classes;
    }

    createTables(models) {
        if (models) this.models = new Model(models);

        for (const i in this.models) {      
            createTable(this, this.models[i]);
        }
    }

    init(models) {
        this.models = new Model(models);        
        this.createTables();
        return this.createClasses();
    }
}

export { ModelFactory as default };