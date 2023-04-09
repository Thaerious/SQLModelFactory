/**
 * Takes an object and divides it into keys, values, and placeholders for use in SQL statements.
 */

export function divideObject(object) {
    const divided = {
        keys: [],
        values: []
    };

    for (const key of Object.keys(object)) {
        divided.keys.push(key);
        divided.values.push(object[key]);
    }

    divided.placeHolders = new Array(divided.keys.length).fill("?").join();
    return divided;
}
