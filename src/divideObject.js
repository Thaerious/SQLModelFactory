import { hasReference, extractReference } from "./extractReference.js";

/**
 * Divide an object into keys, values, and placeholders for use in SQL statements.
 * 
 * If any of the values of the object is an object with an idx field, the idx field is used instead.
 * 
 * keys: comma delimted string of column names
 * values: array of values
 * placeholders: comma delimited string of question marks '?'.
 * where: 'AND' delimited string of equality operators
 * 
 * Examples:
 * prepare(
 *     `INSERT INTO table (${div.keys}) VALUES (${div.placeHolders}))`
 * ).run(div.values)
 * 
 * prepare(
 *     `SELECT * FROM table WHERE ${div.where}`
 * ).all(div.values);
 */
function divideObject(object, model = {}) {
    const divided = {
        keys: [],     // keys joined
        values: [],
        columns: [],  // keys not joined        
    };

    for (const key of Object.keys(object)) {
        if (key.startsWith("$")) continue;
        divided.keys.push(key);
        divided.columns.push(key);

        if (typeof object[key] === "object" && object[key].idx !== undefined) {            
            divided.values.push(object[key].idx);
        }
        else if (typeof object[key] === "object") {
            divided.values.push({
                key: key,
                class: extractReference(key, model[key]).className,
                value: object[key]
            });
        }
        else {
            divided.values.push(object[key]);
        }
    }

    divided.where = where(divided.keys);
    divided.placeHolders = new Array(divided.keys.length).fill("?").join();
    divided.keys = divided.keys.join();

    return divided;
}

function where(keys) {
    const array = [];
    for (const key of keys) {
        array.push(`${key} = ?`);
    }

    return array.join(" AND ");
}

export default divideObject;
