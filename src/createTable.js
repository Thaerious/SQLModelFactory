import { extractClass } from "./extractClass.js";
import Model from "./Model.js";

/**
* Used internally to create the DB tables used by the proxies.
*/
export default function createTable(factory, model, _fields = [], appends = []) {
    const fields = [..._fields, `idx INTEGER PRIMARY KEY AUTOINCREMENT`];
    const tablename = model.$tablename;

    console.log('\nmodel', model);

    for (const key of Object.keys(model)) {
        console.log("key", key);
        if (key === "$append") {
            for (const v of model[key]) fields.push(v);
        }
        else if (key.startsWith("$")) {
            continue;
        }
        else if (model.$isReference(key)) {
            // a known @class RHS rule
            const extract = extractClass(key, model[key].value);
            fields.push(`${key} ${extract.column}`);
            appends.push(extract.foreignKey);
        }
        else if (model.$isArray(key)) {
            model[key].deRef().$indexTable = `${tablename}_${key}`;
            createArrayIndexTable(factory, `${tablename}_${key}`, tablename);
        }
        else {
            // nested class w/o @reference
            console.log("nested class w/o @reference:", model.$tablename, key, model[key]);
            console.log(model);
            fields.push(`${key} ${model[key]}`);
        }
    }

    const columns = [...fields, ...appends].join(",\n\t");
    const statement = factory.prepare(`CREATE TABLE IF NOT EXISTS ${tablename}(\n\t${columns}\n)`);
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
