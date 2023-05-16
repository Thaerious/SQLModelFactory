/**
 * Look for nested models and move them to their own model.
 */
export default function expandModels(models) {
    let i = 0;
    const root = { ...models };

    for (const name in models) {
        const model = expandModel(name, models[name]);
        root[name] = model;
        model['$tablename'] = model['$tablename'] || name.toLowerCase();
        model['$classname'] = model['$classname'] || name;
    }

    return root;

    function expandModel(modelName, model) {
        const newModel = { ...model };

        for (const key of Object.keys(model)) {
            if (key.startsWith("$")) continue;
            let value = model[key];

            if (typeof value !== "object") continue;

            if (Array.isArray(value)) {
                value = value[0];
                if (typeof value !== "object") continue;

                const newName = `_t${i++}`;
                newModel[key] = [`@${newName}`];

                value.$nested = {
                    parent: modelName,
                    column: key
                };

                value.ridx = "INTEGER NOT NULL";
                value.$append = value.$append || [];
                value.$append.push(
                    `FOREIGN KEY (ridx) REFERENCES ${modelName} (idx) ON DELETE CASCADE`
                );

                value['$tablename'] = value['$tablename'] || newName.toLowerCase();
                value['$classname'] = value['$classname'] || newName;

                root[newName] = expandModel(newName, value);

                if (!newModel.$append) newModel.$append = [];
            } else {
                const newName = `_t${i++}`;
                newModel[key] = `@${newName}`;

                value.$nested = {
                    parent: modelName,
                    column: key
                };
                
                value.ridx = "INTEGER NOT NULL";
                value.$append = value.$append || [];
                value.$append.push(
                    `FOREIGN KEY (ridx) REFERENCES ${modelName} (idx) ON DELETE CASCADE`
                );
                
                value['$tablename'] = value['$tablename'] || newName.toLowerCase();
                value['$classname'] = value['$classname'] || newName;                
                root[newName] = expandModel(newName, value);
            }
        }

        return newModel;
    }
}
