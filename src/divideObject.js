/**
 * Takes an object and divides it into keys, values, and placeholders for use in SQL statements.
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
function divideObject(object) {
    const divided = {
        keys: [],
        values: []
    };

    for (const key of Object.keys(object)) {
        divided.keys.push(key);
        divided.values.push(object[key]);
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

export default divideObject ;
