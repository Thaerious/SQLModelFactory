# Description
In traditional database operations, records are created and updated using SQL queries or similar methods. However, with the help of this module, developers can now use JavaScript classes to create and update database records instead of using SQL queries.

The module acts creates proxies, which act as a mediator between the JavaScript class and the database. The module manages the mapping of the class properties and methods to the database tables, columns, and queries.

With the use of this module, developers can now create and manipulate database records using familiar JavaScript class syntax, which can make code more readable and easier to understand.

## Quick Start
In a typical Model-View-Controller (MVC) framework, a Model represents how the data is organized in the application, while the controller defines how the model is manipulated.

First define the model with a JS object with a field for each model.  The name of the field corresponds to the resulting table name and class name.  The key-value fields within a model description maps to the column names and descriptions in the SQL table.

The controllers are provided by the returned classes.  Each model has a single controller associated with it.  This controller will have a getter and a setter each field in the model.

```js
const models = {
    "Game": {
        "name": "VARCHAR(32)",
    },
    "Cred": {
        "username": "VARCHAR(32)",
        "prepare": "VARCHAR(32)",
        "email": "VARCHAR(64)",
        "created": "DATE DEFAULT (datetime('now','localtime'))",
        "game": "@Game",
        "friends": ["@Cred"]
    }
};

const factory = new ModelFactory(DBPATH, { /*verbose: console.log*/ });
const { Game, Cred } = factory.createClasses(models);
Game.$createTables();
Cred.$createTables();

const homer = new Cred({ username: "Homer", email: "homer@eden.com" });
const marge = new Cred({ username: "Marge", email: "marge@eden.com" });
homer.game = new Game({ name: "Homer's Game" });

homer.friends.push(marge);
marge.friends.push(homer);     
```

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
