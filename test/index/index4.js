import { mkdirif } from "@thaerious/utility";
import ModelFactory from "../../src/ModelFactory.js";
import logger from "../../src/setupLogger.js";

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
const factory = new ModelFactory(DBPATH, { verbose: logger.sql });
const { Game, Cred } = factory.createClasses(models);
factory.createTables();

class XCred extends Cred {
    constructor(username, email) {
        return super({ username: username, email: email });
    }
}

const c1 = new Cred({ username: "ed", email: "ed@there.ca" });
const c2 = new XCred("bill", "bill@there.ca");
const c3 = { username: "allan", email: "al@there.ca" };

console.log(factory.isReflected(c1));
console.log(factory.isReflected(c2));
console.log(factory.isReflective(c3));
