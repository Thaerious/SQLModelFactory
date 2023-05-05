/**
 * Find the reference value (starts with @) from within 'value'.
 * Returns : {
 *     column : the column descriptor for an sql create statement
 *     foreignKey : the foreign key descriptor for an sql create statement
 *     className : the class name extracted from value (sans @)
 */
function extractReference(key, value) {
    const extract = /@[a-zA-Z0-9_]+/.exec(value);
    
    if (!extract) return {
        raw: value,
        column: value,
        foreignKey: null
    };
    
    if (Array.isArray(value)) value = value[0];

    const className = extract[0].substring(1);
    const before = value.substring(0, extract.index);
    const after = value.substring(extract.index + extract[0].length);

    return {
        raw: value,
        column: before + "INTEGER" + after,
        foreignKey: `FOREIGN KEY (${key}) REFERENCES ${className.toLowerCase()} (idx)`,
        className: className
    }
}

function hasReference(value) {
    if (typeof value !== "string") return false;
    const extract = /@[a-zA-Z0-9_]+/.exec(value);
    return extract != null;
}

export { extractReference, hasReference }