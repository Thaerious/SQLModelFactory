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

const c1 = Cred.get(1);
const c2 = Cred.get(2);

console.log("---------------------------");
console.log("c1", c1);
console.log("c2", c2);
