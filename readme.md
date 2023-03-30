
# Description
This Javascript module creates Class objects to manage the creation and updating of database tables.

## Quick Start
Assign proxies to the ModelBase class and create the databse tables.
Use the proxied class 'Model' to create new records.

    import ModelFactory from "sql-model-factory";

    const mFactory = new ModelFactory("production.db");
    const model = {
        "name": "VARCHAR(32) NOT NULL",
        "score": "INTEGER DEFAULT 0 NOT NULL"
    }

    class ModelBase {}
    const Model = mFactory.createClass(model, ModelBase);

Check the table with.  Notice the extra column, that is the 'idx' column.
Because of this, the model can not contain an idx field.

    > sqlite3 .\production.db ".tables"
    ModelBase

    > sqlite3 .\production.db "SELECT * FROM ModelBase"
    1|adam|1

Fields can be set normally and chagnes are represented in the DB.

### js

    instance.name = "eve";
    instance.score = 4;

### bash

    > sqlite3 .\production.db "SELECT * FROM ModelBase"
    1|adam|1
    2|eve|4

Methods from the base class can manipulation fields on the model.

### js

    const instance = new Model({ name: "adam", score: 1 });
    instance.incrementScore();

### bash

    > sqlite3 .\production.db "SELECT * FROM ModelBase"
    1|adam|2

## Using Arrays
Arrays in the reference object are stored in their own table.
They are declared in the model as a child object.
Add to the array by passing in an object with the appropriate fields.
Use 'delete' to remove the array entry. 

``` javascript
const model = {
    "name": "VARCHAR(32) NOT NULL",
    "score": "INTEGER DEFAULT 0 NOT NULL",
    "games": {
        "name": "VARCHAR(64)",
        "state": "VARCHAR(64)"
    }
}

...

const m = new Model({ name: "steve", "score": "3" });
m.games['apple'] = {"name": "first", "state": "finished"}
delete m.games['apple'];
```

Array operations will update the DB.
``` javascript
m.games.push({ "name": "first", "state": "finished" });
console.log(m.$data);
m.games.pop();
console.log(m.$data);
```

## Advanced Usage
Methods for manipulting the database are prefixed by the '$' symbol.

* List All Indices:  ```Model.$dir()```
* List All Records:  ```Model.$all()```
* Drop Table:  ```Model.$drop()```
* Delete a Record:  ```instance.$delete()```

## Examples

Retrieve an array of all records as reflective objects.
```javascript
    const array = Model.$dir().map(idx => new Model(idx));
```
