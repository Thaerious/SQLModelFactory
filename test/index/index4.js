import { mkdirif } from "@thaerious/utility";
import ModelFactory from "../../src/ModelFactory.js";
import createTable from "../../src/createTable.js";
import Model from "../../src/Model.js";

const models = {
    "Game": {
        "name": "VARCHAR(32)",
        "creator": "@Cred NOT NULL"
    },
    "Cred": {
        "username": "VARCHAR(32)",
        "email": "VARCHAR(64)",
        "friends": ["@Cred"],
        "nicknames": [{ "value": "VARCHAR(32)" }]
    }
}

const DBPATH = mkdirif("test", "assets", "test.db");
const factory = new ModelFactory(DBPATH, {});

factory.init(models);