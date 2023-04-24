/**
 * Returns true if every name exists verbatim on the model.
 * Otherwise returns false.
 */
export default function validateColumnNames (model, ...names) {
    for (const name of names) {
        if (name === "idx") continue;
        if (!model[name]) throw new Error(`Invalid column name '${name}'`);
    }
    return true;
}