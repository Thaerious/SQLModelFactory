import sqlite3 from "better-sqlite3";
import ClassProxy from "./ClassProxy.js";

class ModelFactoryError extends Error{
    constructor(cause, expression) {
        super('SQL prepare error', { cause });
        this.expression = expression;        
    }
}

/**
 * This class is responsible for creating and managing database tables and their corresponding models. 
 * This class is a factory that generates classes whcih in turn use a proxy to update the tables on 
 * write and store values for future reads.
 */
class ModelFactory {
    constructor(dbFile, sqlOptions) {
        this.dbFile = dbFile;
        this.sqlOptions = sqlOptions;
        this.classes = {};
    }

    static instance(dbFile, sqlOptions) {
        if (!this._instance) {
            this._instance = new ModelFactory(dbFile, sqlOptions);
        }
        return this._instance;
    }

    /**
     * The prepare() method is used interanally to prepare an SQL statement it for execution
     * using the options passed into the constructor.
     */
    prepare(expression) {
        try {
            if (this.sq3) return this.sq3.prepare(expression);

            this.sq3 = new sqlite3(this.dbFile, this.sqlOptions);
            this.sq3.pragma('journal_mode = WAL');
            const statement = this.sq3.prepare(expression);
            return statement;
        } catch (error) {
            throw new ModelFactoryError(error, expression);
        }
    }

    close() {
        if (!this.sq3) return;
        this.sq3.close();
    }

    /**
     * Create a new class controller for an underlying table.
     * This method will create a new table based on the class name if one does
     * not already exist.  If a table does already exist but doesn't match the
     * schema outlined in 'model' future operations may fail.
     */
    createClasses(models) {
        for (const name in models) {
            this.classes[name] = new Proxy(function () { }, new ClassProxy(this, name, models[name]));
        }

        return this.classes;
    }   
}

export default ModelFactory;