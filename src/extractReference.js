function extractReference (key, value) {
    const extract = /@[a-zA-Z0-9_]+/.exec(value);
    if (!extract) return {
        column: value,
        foreignKey: null
    };
    
    const columnRule = value.substring(0);
    const tableName = extract[0].substring(1).toLowerCase();
    const before = value.substring(0, extract.index);
    const after = value.substring(extract.index + extract[0].length);

    return {
        column: before + "INTEGER" + after,
        foreignKey: `FOREIGN KEY (${key}) REFERENCES ${tableName} (idx)`
    }
}

function hasReference(value) {
    if (typeof value !== "string") return false;
    const extract = /@[a-zA-Z0-9_]+/.exec(value);
    return extract != null;
}

export { extractReference, hasReference }