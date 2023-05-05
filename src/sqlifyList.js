import { hasReference, extractClass } from "./extractClass.js";

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
function sqlifyList(list, model = {}) {
    const divided = {
        values: [],
        columns: [],
        map: {}
    };

    for (const data of list) {
        divided.columns.push(data.key);
        divided.values.push(data.value);
        divided.map[data.key] = data.value;
    }

    divided.where = where(divided.columns);
    divided.placeHolders = new Array(divided.columns.length).fill("?").join();
    divided.keys = divided.columns.join();

    return divided;
}

function where(keys) {
    const array = [];
    for (const key of keys) {
        array.push(`${key} = ?`);
    }

    return array.join(" AND ");
}

export default sqlifyList;
