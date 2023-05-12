import ModelFactory, { expandModels } from "../../src/ModelFactory.js";
import { mkdirif } from "@thaerious/utility";
import fs from "fs";

const models = {
    "Address": {
        "city": "VARCHAR(64)"
    },
    "Cred": {
        "alias": "VARCHAR(64)",
        "name": {
            "first": "VARCHAR(64)",
            "last": "VARCHAR(64)"
        },
        "games": [{
            "name": "VARCHAR(32)",
        }],
        "home": "@Address",
        "friends": ["@Cred"],
    }
}

const DBPATH = mkdirif("test", "assets", "test.db");
if (fs.existsSync(DBPATH)) fs.rmSync(DBPATH);

const factory = ModelFactory.instance;
// factory.options = { verbose: console.log };
factory.dbFile = DBPATH;
factory.createClasses(models);
factory.createTables();

console.log(factory.models.Cred.home.indexTable);

const cred = new factory.classes.Cred();
// console.log(cred);

