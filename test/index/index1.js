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
}

const DBPATH = mkdirif("test", "assets", "test.db");
const factory = new ModelFactory(DBPATH, { /* verbose: console.log */ });
const { Game, Cred } = factory.createClasses(models);
factory.createTables();

class XCred extends Cred {
    constructor(username, email) {        
        return super({ username : username, email : email });
    }
}

const c1 = new XCred("ed", "ed@there.ca");
const c2 = Cred.get({ "username": "ed" });
console.log("c1", c1);
console.log("c2", c2);

assert.strictEqual(c1, c2);