import { ModelProxy, FieldProxy } from "./ModelProxy.js";

export default function expandModels(p00) {
    const p10 = pass10(p00);
    const p11 = pass11(p10);
    const p40 = pass40(p11);
    // const p50 = pass50(p40);
    return p40;
}

// Move nested to their own class
function pass10(models) {
    let i = 0;
    const root = {};

    for (const name in models) {
        const model = root[name] = {
            $classname: name,
            $tablename: name.toLowerCase(),
            $append: [],
            $nested: false,
            $modeltype: 'object',
            ...models[name]
        }

        for (const [key, value] of Object.entries(model)) {
            const field = Array.isArray(value) ? value[0] : value;
            const isArray = Array.isArray(value);

            if (!key.startsWith("$") && typeof field === "object") {
                const newName = `_t${i++}`;
                model[key] = isArray ? `[]${newName}` : `@${newName}`;

                root[newName] = {
                    $classname: newName,
                    $tablename: newName.toLowerCase(),
                    $append: [],
                    $nested: {
                        parent: name,
                        column: key
                    },
                    $modeltype: isArray ? "array" : "object",
                    ...field,
                }
            }
        }
    }

    return root;
}

// Proxify all models
function pass11(models) {
    const root = {};

    for (const name in models) {
        root[name] = new ModelProxy(root, models[name]);
    }

    return root;
}

// Create object field index tables
function pass40(models) {
    const root = { ...models };

    for (const name in models) {
        const model = models[name];

        for (const [key, field] of Object.entries(model)) {
            if (field.isRef) {
                root[`${name}_${key}`] = {
                    "oidx": "INTEGER NOT NULL",
                    "ridx": "INTEGER NOT NULL",
                    "$tablename": `${name}_${key}`.toLowerCase(),
                    "$modeltype": `index`,
                    "$append": [
                        "UNIQUE(oidx, ridx)",
                        `FOREIGN KEY (ridx) REFERENCES ${name.toLowerCase()} (idx) ON DELETE CASCADE`,
                        `FOREIGN KEY (oidx) REFERENCES ${field.tableName} (idx) ON DELETE CASCADE`
                    ]
                }
            }
        }
    }

    return root;
}

// Create array field index tables
function pass50(models) {
    const root = { ...models };

    for (const name in models) {
        const model = models[name];

        for (const [key, field] of Object.entries(model)) {
            if (field.isArray) {
                root[`${name}_${key}`] = {
                    "aidx": "VARCHAR(64) NOT NULL",
                    "oidx": "INTEGER NOT NULL",
                    "ridx": "INTEGER NOT NULL",
                    "$tablename": `${name}_${key}`.toLowerCase(),
                    "$append": [
                        "UNIQUE(aidx, ridx)",
                        `FOREIGN KEY (ridx) REFERENCES ${name.toLowerCase()} (idx) ON DELETE CASCADE`,
                        `FOREIGN KEY (oidx) REFERENCES ${field.tableName} (idx) ON DELETE CASCADE`
                    ]
                }
            }
        }
    }

    return root;
}