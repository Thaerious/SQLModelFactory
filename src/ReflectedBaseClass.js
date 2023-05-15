import ArrayInstanceHandler from "./proxies/ArrayInstanceHandler.js";
import divideObject from "./divideObject.js";
import RootHandler from "./proxies/RootHandler.js";

/**
 * Create a list of key-value pairs of the object's fields.
 * Only fields that are specified on the model are included.
 * Fields not found on the model are ignored.
 */
function listify(object, model) {
    const list = [];
    for (const key of Object.keys(model)) {
        const value = object[key];

        if (model[key].isArray && object[key] === undefined) {
            list.push({ key: key, value: [], model: model[key] });
        }
        if (object[key] !== undefined) {
            list.push({ key: key, value: value, model: model[key] });
        }
    }
    return list;
}

class ReflectedBaseClass {
    constructor(...args) {
        if (!args[0].idx) { // todo check that table has a matching idx value and args class matches this
            this.idx = this._constructDefault();
        } else {
            this.idx = args[0].idx;
        }

        const proxy = new Proxy(new RootHandler({
            factory: this.factory,
            model: this.model, 
            idx: this.idx
        }), this);

        if (args[0] !== undefined && Object.keys(args[0]).length > 0) {
            this._constructFromData(proxy, args[0]);
        }

        this.instantiated.set(this.idx, proxy);

        return proxy;
    }

    get model() { return this.constructor.model }
    get factory() { return this.constructor.factory }
    get instantiated() { return this.constructor.instantiated }
    get tablename() { return this.constructor.model.$tablename }

    static get model() { return this.model }
    static get factory() { return this.factory }
    static get instantiated() { return this.instantiated }
    static get tablename() { return this.model.$tablename }    

    /**
     * Clear previously instantiated objects.
     * Cause all constructors and getters to return new objects.
     * Externally stored objects will no longer be reference equal.
     */
    static reset() {
        this.instantiated.clear();
    }

    _constructDefault() {
        return this.constructor.factory.prepare(
            `INSERT INTO ${this.model.$tablename} DEFAULT VALUES`
        ).run().lastInsertRowid;
    }

    _constructFromData(proxy, source) {
        const list = listify(source, this.constructor.model);

        for (const item of list) {
            proxy[item.key] = item.value;
        }
    }

    /**
     * Retrieve a single object from the DB.
     * If there is no associated DB entry returns 'undefined'.
     * 
     * Conditions can either be an integer or an object.  If it's an integer retrieves by
     * 'idx', otherwise the key-values of the object are used.  It retrieves objects where
     * the column-values of the DB match exactly the key-values of the conditions object.
     * 
     * @param {Integer | Object} conditions - Selector for which row to retrieve.
     */
    static get(conditions) {
        if (typeof conditions === "number") {
            if (this.instantiated.has(conditions)) {
                return this.instantiated.get(conditions);
            }
            return this.get({ idx: conditions });
        }

        const div = divideObject(conditions);
        const row = this.factory.prepare(`
            SELECT * FROM  ${this.model.$tablename} WHERE ${div.where}
        `).get(div.values);

        if (!row) return undefined;

        if (this.instantiated.has(row.idx)) {
            return this.instantiated.get(row.idx);
        }

        return new this(row);
    }
}



export default ReflectedBaseClass;