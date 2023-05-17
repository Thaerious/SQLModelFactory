import { extractClass } from "./extractClass.js";
import Model from "./Model.js";

/**
* Used internally to create the DB tables used by the proxies.
*/
export default function createTable(factory, model, _fields = [], appends = []) {
    const fields = [..._fields, `idx INTEGER PRIMARY KEY AUTOINCREMENT`];

    for (const field of model) {       
        if (field.isReference()) {
            // a known @class RHS rule
            const extract = field.value.split(" ");
            extract[0] = "INTEGER";
            fields.push(`${field.key} ${extract.column}`);
            model.$append.push(`FOREIGN KEY (${field.key}) REFERENCES ${field.deRef().$classname} (idx)`);
        }
        else if (field.isArray()) {
            createArrayIndexTable(factory,  field.indexTable(), model.$tablename);
        }
        else {
            // nested class w/o @reference
            fields.push(`${field.key} ${field.value}`);
        }
    }

    for (const e of model.$append.flat()) fields.push(e);

    const columns = [...fields, ...appends].join(",\n\t");
    const statement = factory.prepare(`CREATE TABLE IF NOT EXISTS ${model.$tablename}(\n\t${columns}\n)`);
    statement.run();
    return statement;
}

/**
 * Used internally to create the array tables used by the proxies.
 */
function createArrayIndexTable(factory, tablename, rootTable) {
    const model = {};
    model[tablename] = {
        "aidx": "VARCHAR(64)",    // array index (in js object)
        "ridx": "INTEGER",        // parent/root index (what is referring)
        "oidx": "INTEGER",        // object index (what is referred to)
        "$append": [
            `FOREIGN KEY (ridx) REFERENCES ${rootTable} (idx) ON DELETE CASCADE`
        ]
    };

    createTable(factory, new Model(model)[tablename]);
}
