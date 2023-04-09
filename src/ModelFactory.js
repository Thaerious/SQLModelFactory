import sqlite3 from "better-sqlite3";
import { ConstructorHandler } from "./ConstructorHandler.js";

/**
 * This class is responsible for creating and managing database tables and their corresponding models. 
 * This class is a factory that generates classes whcih in turn use a proxy to update the tables on 
 * write and store values for future reads.
 */
class ModelFactory {
    setup(dbFile, sqlOptions) {
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
        // this.__createObjectTable(model, aClass.name);
        return new Proxy(aClass.constructor, new ConstructorHandler(this, aClass, model));
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

export default ModelFactory;