/**
 * Look for inferred models and move them to their own class/model.
 */
export default function expandModels(models) {
    let i = 0;
    const root = { ...models };

    for (const modelName in models) {
        const model = expandModel(modelName, models[modelName]);
        root[modelName] = model;
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

                value.$inferred = modelName;
                value.ridx = "INTEGER NOT NULL";
                value.$append = value.$append || [];
                value.$append.push(
                    `FOREIGN KEY (ridx) REFERENCES ${modelName} (idx) ON DELETE CASCADE`
                );

                root[newName] = expandModel(modelName, value);

                if (!newModel.$append) newModel.$append = [];
            } else {
                const newName = `_t${i++}`;
                newModel[key] = `@${newName}`;

                value.$inferred = modelName;
                value.ridx = "INTEGER NOT NULL";
                value.$append = value.$append || [];
                value.$append.push(
                    `FOREIGN KEY (ridx) REFERENCES ${modelName} (idx) ON DELETE CASCADE`
                );
                
                root[newName] = expandModel(modelName, value);
            }
        }

        return newModel;
    }
}
