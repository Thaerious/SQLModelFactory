import { mkdirif } from "@thaerious/utility";
import ModelFactory from "../../src/ModelFactory.js";
import logger from "../../src/setupLogger.js";
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
const factory = new ModelFactory(DBPATH, {  verbose: logger.sql });
const { Game, Cred } = factory.createClasses(models);
factory.createTables();

const c1 = new Cred({
    "username": "bill",
    "email": "bill@mail.com",
    "game": { name: "bill's game" }
});

console.log("---");

const c2 = new Cred({
    "username": "allan",
    "email": "al@mail.com",
    "friends": [
        c1,
        { username: "pat" }
    ]
});

c2.friends.push(c2);

console.log("---------------------------");
console.log(c2);
