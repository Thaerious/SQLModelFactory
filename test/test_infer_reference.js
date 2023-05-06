import assert from "assert";
import ModelFactory from "../src/ModelFactory.js";
import { mkdirif } from "@thaerious/utility";
import ParseArgs from "@thaerious/parseargs";
import fs from "fs";
import divideObject from "../src/divideObject.js";

const args = new ParseArgs().run();

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

describe("SQL Model Factory Test (test_main.js)", function () {
    before(function () {
        if (fs.existsSync(DBPATH)) {
            console.log(`  Before: Removing database '${DBPATH}'`);
            fs.rmSync(DBPATH, { recursive: true });
        }
    });

    before(function () {
        this.factory = new ModelFactory(DBPATH, { /* verbose: console.log */ });
        this.classes = this.factory.createClasses(models);
        this.classes.Game.createTables();
        this.classes.Cred.createTables();
    });

    after(function () {
        this.factory.close();
    });

    after(function () {
        if (!args.flags["no-clean"]) {
            if (fs.existsSync(DBPATH)) {
                console.log(`After: Removing database '${DBPATH}'`);
                fs.rmSync(DBPATH, { recursive: true });
            }
        }
    });

    describe("create model classes", function () {
        it("sanity check: classes were created", function () {
            assert.ok(this.classes.Game);
            assert.ok(this.classes.Cred);
        });
    });

    describe("divideObject.js", function () {
        before(function () {
            try {
                const cred = new this.classes.Cred({ "username": "allan" });
                this.div = divideObject({
                    user: cred,
                    gamename: "al's game"
                }, this.classes.Cred.model);
            } catch (error) {
                console.log(error.cause);
            }
        });

        it("divide object replaces objects with their .idx field", function () {
            assert.strictEqual(this.div.values[0], 1);
        });
    });

    describe("retrieve using reflected object", function () {
        before(function () {
            this.cred = new this.classes.Cred({ "username": "bill" });
            this.cred.game = new this.classes.Game({ "name": "agame" });
        });

        it("the object is retrieved", function () {
            const all = this.classes.Cred.all({ game: this.cred.game });
            assert.strictEqual(all[0], this.cred);
        });
    });
});