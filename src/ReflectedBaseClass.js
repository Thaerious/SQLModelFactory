import ArrayInstanceHandler from "./ArrayInstanceHandler.js";
import divideObject from "./divideObject.js";

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

        const proxy = new Proxy(this, this);

        if (args[0] !== undefined && Object.keys(args[0]).length > 0) {
            this._constructFromData(proxy, args[0]);
        }

        this.instantiated.set(this.idx, proxy);

        console.log("------");
        console.log(args[0]);
        console.log(proxy);

        return proxy;
    }

    get model() { return this.constructor.model }
    get factory() { return this.constructor.factory }
    get instantiated() { return this.constructor.instantiated }

    _constructDefault() {
        return this.constructor.factory.prepare(
            `INSERT INTO ${this.model.$tablename} DEFAULT VALUES`
        ).run().lastInsertRowid;
    }

    _constructFromData(proxy, source) {
        const list = listify(source, proxy.constructor.model);
        console.log("list", list);

        for (const item of list) {
            proxy[item.key] = item.value;
        }
    }


    _updatePrim(prop, value) {
        this.factory.prepare(`
            UPDATE ${this.model.$tablename}
            SET ${prop} = ?
            WHERE idx = ${this.idx}
        `).run(value);
    }

    _updateObject(prop, value) {
        const div = divideObject(
            value,
            this.model[prop].deRef
        );
        
        const aClass = this.factory.classes[this.model[prop].deRef.$classname];
        const instance = new aClass(value);
        const indexTable = `${this.model.$tablename}_${prop}`;

        this.factory.prepare(`
            INSERT OR REPLACE INTO ${indexTable}
            (oidx, ridx) VALUES (?, ?)`
        ).run(instance.idx, this.idx);

        return instance;
    }

    _updateArray(prop, value) {
        const indexTable = `${this.model.$tablename}_${prop}`;

        this.factory.prepare(`
            DELETE FROM ${indexTable}
            WHERE ridx = ?`
        ).run(this.idx);

        if (value === undefined || value === null) return;

        this[prop] = new ArrayInstanceHandler(
            {
                factory: this.factory,
                idx: this.idx,
                tableName: this.model[prop].$tablename,
                model: this.model[prop].deRef,
                indexModel: this.factory.models[`${this.model.$classname}_${prop}`],
                map: this.instantiated,
                constructor: this.factory.classes[this.model[prop].deRef.classname]
            }
        );

        for (const i in value) {
            this[prop][i] = value[i];
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

    get(target, prop) {
        return Reflect.get(...arguments);
    }

    set(target, prop, value) {
        switch (this.model[prop].type) {
            case "primitive":
                this._updatePrim(prop, value);
                return Reflect.set(...arguments);
            case "nested_object":
                this._updateObject(prop, value);
                return Reflect.set(this, prop, this._updateObject(prop, value));
            case "ref_object":
                this._updateObject(prop, value);
                return Reflect.set(this, prop, this._updateObject(prop, value));
            case "nested_array":
                this._updateArray(prop, value);
                return Reflect.set(...arguments);
            case "ref_array":
                this._updateArray(prop, value);
                return Reflect.set(...arguments);
        }


    }
}



export default ReflectedBaseClass;