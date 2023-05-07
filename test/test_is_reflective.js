import assert from "assert";
import ModelFactory from "../src/ModelFactory.js";
import { mkdirif } from "@thaerious/utility";
import ParseArgs from "@thaerious/parseargs";
import fs from "fs";

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

describe("Test is reflective method (ModelFactory.js)", function () {
    before(function () {
        if (fs.existsSync(DBPATH)) {
            console.log(`  Before: Removing database '${DBPATH}'`);
            fs.rmSync(DBPATH, { recursive: true });
        }
    });

    before(function () {
        this.factory = new ModelFactory(DBPATH, { /* verbose: console.log */ });
        this.classes = this.factory.createClasses(models);
        this.factory.createTables();
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

    describe("returns false for non-objects", function () {
        it("number", function () {
            assert.ok(!this.factory.isReflected(1));
        });
        it("undefined", function () {
            assert.ok(!this.factory.isReflected(undefined));
        });        
        it("null", function () {
            assert.ok(!this.factory.isReflected(null));
        });    
        it("string", function () {
            assert.ok(!this.factory.isReflected(null));
        });      
        it("boolean", function () {
            assert.ok(!this.factory.isReflected(true));
        });          
    });

    describe("returns false for pojo", function () {
        it("pojo", function () {
            assert.ok(!this.factory.isReflected({}));
        });
        it("pojo with idx", function () {
            assert.ok(!this.factory.isReflected({ idx: 1 }));
        });                
    });    

    describe("true for reflective object", function () {
        it("reflective", function () {
            assert.ok(new this.factory.classes.Cred({username : "bill"}));
        });              
    });      
});
    