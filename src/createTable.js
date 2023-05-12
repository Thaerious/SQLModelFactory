import { extractClass } from "./extractClass.js";

export default function createTable(factory, model) {
    const fields = [`idx INTEGER PRIMARY KEY AUTOINCREMENT`];
    const append = [...model.$append];
    
    for (const [key, field] of Object.entries(model)) {
        if (key.startsWith("$")) continue;
        if (!field.isRef && !field.isArray) {
            fields.push(`${key} ${field}`);
        }      
    }

    const tableName = model.$tablename;
    const columns = [...fields, ...append].join(",\n\t");
    const statement = factory.prepare(`CREATE TABLE IF NOT EXISTS ${tableName}(\n\t${columns}\n)`);
    statement.run();
    return statement;    
}
