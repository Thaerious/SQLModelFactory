// Run this file for coverage test
// rm test/assets/*; npx c8 -r html node .\test\index\index1.js

import { mkdirif } from "@thaerious/utility";
import ModelFactory from "../../src/ModelFactory.js";
import assert from "assert";

const models = {
    "Game": {
        "name": "VARCHAR(32)",
    },
    "Cred": {
        "username": "VARCHAR(32)",
        "email": "VARCHAR(64)",
        "created": "DATE DEFAULT (datetime('now','localtime'))",
        "game": "@Game",
        "friends": ["@Cred"],
        "$append": [
            "appended VARCHAR(32) DEFAULT 'hello'"
        ]
    }
};

(() => {
    const DBPATH = mkdirif("test", "assets", "test.db");
    const factory = new ModelFactory(DBPATH, { /* verbose: console.log */ });
    const { Game, Cred } = factory.createClasses(models);
    factory.createTables();

    class XCred extends Cred {
        constructor(username, email) {
            return super({ username: username, email: email });
        }
    }

    const c1 = new XCred("ed", "ed@there.ca");
    const c2 = Cred.get({ "username": "ed" });

    // closing the factory will just cause it to reopen, but it's slower
    factory.close();

    // retrieved objects (#get) will pull from previously instatiated objects
    assert.strictEqual(c1, c2);

    const c3 = new Cred({ username: "bill", email: "bill@mail.com" });
    c1.friends.push(c3);
    c1.friends.push(c1);

    c1.username = "steve";
    assert.strictEqual(c1.username, "steve");

    console.log("c1", c1);
    console.log("c2", c2);

    // Preparing a bad SQL query throws an exception
    try {
        factory.prepare("SELECT * FROM not_a_table");
    } catch { }

    // This is not a reflective object
    assert.ok(!factory.isReflected({}));

    // This is also not a reflective object
    class Foo { constructor() { this.idx = 0; } }
    assert.ok(!factory.isReflected(new Foo()));

    // You are not allowed to overwrite idx    
    try {
        c1.idx = 99;
    } catch { }

})();

// The factory in this call is not the same as the previous factory
// Tables not created here, they were created above
// Objects retrieved should share values but not references
(() => {
    const DBPATH = mkdirif("test", "assets", "test.db");
    ModelFactory.instance.dbFile = DBPATH;
    ModelFactory.instance.options = {};
    const { Game, Cred } = ModelFactory.instance.createClasses(models);

    // c3 doesn't exist because the name was changed to 'steve'.
    const c3 = Cred.get({ "username": "ed" });
    assert.strictEqual(undefined, c3);
    console.log("c3", c3);

    const c4 = Cred.get({ "username": "steve" });
    assert.strictEqual(c4.username, "steve");
    assert.strictEqual(c4.email, "ed@there.ca");

    // set c4 game using a pojo object
    c4.game = { name: "steve's game" };

    // the game was inserted in the DB thus can be retrieved    
    const g1 = Game.get(c4.game.idx);

    // set game using reflected object
    const g2 = new Game({ name: "justa game" });
    c4.game = g2;
    assert.strictEqual(c4.game.name, "justa game");

    // set game using incorrect object throws exception
    const c2 = Cred.get(2);

    // setting values on non-reflective fields
    c4.foo = "bar";

    try {
        c4.game = c2;
    } catch { }

    // delete an object from the db
    c4.delete();

    // getting a delted object returns undefined
    assert.strictEqual(Cred.get(c4.idx), undefined);

    // adding incorrect reflective object to array throws exception    
    const c5 = new Cred({ username: "adam" });
    try {
        c5.friends.push(new Game({ name: "ima game" }));
    } catch { }

    // adding pojo to array will create a new object using nested type
    c5.friends.push({ username: "xandor" });

    // Create a new reflected object with pojo fields that become reflected
    const c6 = new Cred({
        username: "Janna",
        game: { name: "Janna's Game" },
        friends: [
            c5,
            { username: "Kevin" }
        ]
    });
    console.log(c6);

    // Kevin is now a user
    const c7 = Cred.get({ "username": "Kevin" });
    assert.ok(c7);

    // Arrays can't have primitive values
    try {
        c7.friends.push("bill");
    } catch { }
    console.log(c7);

    // Remove value from array
    const c8 = new Cred({ username: "billy", email: "billy@mail.com" });
    const c9 = new Cred({ username: "emanual", email: "emanual@mail.com" });
    c8.friends[0] = c9;

    console.log(ModelFactory.instance.prepare("select * from cred_friends").all());
    delete c8.friends[0];
    assert.ok(!c8.friends[0]);
    console.log(ModelFactory.instance.prepare("select * from cred_friends").all());

    // Constructor ignores extraneous values
    const c10 = new Cred({ username: "billy", email: "billy@mail.com", imafield: "no you're not" });
    assert.ok(!c10.imafield);

    // Retrieve objects based on a reflected value
    const g3 = new Game({ "name": "ima game" });
    c10.game = g3;
    const c10b = Cred.get({ game: g3 });
    assert.strictEqual(c10b, c10);

    // Empty Constructor
    const c11 = new Cred();

    // Empty Object Constructor
    const c12 = new Cred({});

    // Retrieve all Cred objects
    Cred.all();

    // Retrieve all with a limiter
    Cred.all({ username: "billy" });

    // Retrieve all by number (should only ever retrieve 1)
    assert.strictEqual(Cred.all(c11.idx).length, 1);

    // Retrieve all by reflected object
    assert.strictEqual(Cred.all({ game: g3 }).length, 1);

    // Construct with reflected Object
    const c13 = new Cred({ game: g3 });
    assert.strictEqual(c13.game, g3);
})();
