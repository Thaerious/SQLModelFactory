import ModelFactory, { expandModels } from "../../src/ModelFactory.js";
import { mkdirif } from "@thaerious/utility";
import fs from "fs";

const models = {
    "Address": {
        "city": "VARCHAR(64)",
        "postal": "CHAR(7)"
    },
    "Cred": {
        "alias": "VARCHAR(64)",
        "name": {
            "first": "VARCHAR(64)",
            "last": "VARCHAR(64)"
        },
        "games": [{
            "name": "VARCHAR(32)",
            "size": "Integer"
        }],
        "home": "@Address",
        "friends": ["@Cred"],
    }
}

const DBPATH = mkdirif("test", "assets", "test.db");
if (fs.existsSync(DBPATH)) fs.rmSync(DBPATH);

const factory = ModelFactory.instance;
factory.options = { verbose: console.log };
factory.dbFile = DBPATH;
const { Address, Cred } = factory.createClasses(models);
factory.createTables();

const c1 = new Cred({ alias: "i am friend" });
c1.home = { city: "Guelph" };

console.log(c1.home.idx);