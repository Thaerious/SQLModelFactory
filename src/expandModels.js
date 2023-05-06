/**
 * Remove all nested models replacing them with declared models.
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
            if (key.startsWith("$"))
                continue;
            let value = model[key];

            if (typeof value !== "object") continue;

            if (Array.isArray(value)) {
                value = value[0];
                if (typeof value !== "object") continue;
                const newName = `_t${i++}`;
                newModel[key] = [`@${newName}`];
                root[newName] = expandModel(modelName, value);
            } else {
                const newName = `_t${i++}`;
                newModel[key] = `@${newName}`;
                root[newName] = expandModel(modelName, value);
            }
        }

        return newModel;
    }
}
