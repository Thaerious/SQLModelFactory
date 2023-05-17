import assert from "assert";
import mkdirIf from "@thaerious/utility/src/mkdirif.js";
import Model from "../../src/Model.js";
import ModelFactory from "../../src/ModelFactory.js";

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

(function () {
    const DBPATH = mkdirIf("test", "assets", "test.db");
    const factory = new ModelFactory(DBPATH, {});
    const { Game, Cred } = factory.init(models);

    this.eve = new Cred({ username: "eve", email: "eve@eden.com" });
    this.cain = new Cred({ username: "cain", email: "cain@eden.com" });
    this.game = new Game({ name: "eve's game" });

    console.log(this.eve);
    this.eve.friends.push(this.cain);
    console.log(this.eve);
}.bind({}))()

