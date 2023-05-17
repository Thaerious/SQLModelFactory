import { mkdirif } from "@thaerious/utility";
import ModelFactory from "../../src/ModelFactory.js";

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
const { Game, Cred } = factory.init(models);

const c1 = new Cred();
factory.options = { verbose: console.log };
// const c2 = new Cred({ username: "adam", friends: [{username}] });
// console.log(c2);

const g1 = new Game({ creator: { username: 'bill' } });