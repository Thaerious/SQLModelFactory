import assert from "assert";
import ModelFactory from "../src/ModelFactory.js";
import ParseArgs from "@thaerious/parseargs";
import setupTests from "./util/setup.js";
import { classNameFromModel } from "../src/extractClass.js";

const args = new ParseArgs().run();

const models = {
    "GameModel": {
        "modelname": "VARCHAR(32)",
        "owner": "@Cred",
        "rounds": [{
            "col": [{
                "category": "VARCHAR(64)",
                "row": [{
                    "value": "INTEGER",
                    "question": "VARCHAR(256)",
                    "answer": "VARCHAR(256)",
                }]
            }]
        }],
        "$append": [
            "UNIQUE(modelname, owner)"
        ]
    },
    "Cred": {
        "username": "VARCHAR(32)",
        "email": "VARCHAR(64)",
        "created": "DATE DEFAULT (datetime('now','localtime'))",
        "games": ["@GameModel"],
        "friends": ["@Cred"]
    }
}

setupTests(models, "Test setting array values on reflective object", function () {

    describe("check rounds table", function () {
        it("", function () {
            const className = classNameFromModel(this.factory.models.GameModel.rounds);
            console.log("className", className);
        });
    });

    describe("assign reflected object", function () {
        before(function () {
            this.c1 = new this.factory.classes.Cred({ "username": "billy" });
            this.c2 = new this.factory.classes.Cred({ "username": "stevie" });
            this.c1.friends.push(this.c2);
        });

        it("is set locally", function () {
            assert.strictEqual(this.c1.friends[0], this.c2);
        });

        it("is set in db", function () {
            const factory = new ModelFactory();
            factory.dbFile = this.factory.dbFile;
            factory.options = this.factory.options;
            factory.createClasses(this.factory.models);

            const c3 = factory.classes.Cred.get(this.c1.idx);
            const c4 = factory.classes.Cred.get(this.c2.idx);
            assert.strictEqual(c3.friends[0], c4);

            factory.close();
        });
    });

    // Nested objects are reflected objects not implicitly create with new, rather
    // they are created from a pojo and examining the model the determine the type.
    describe("constructor with nested array object", function () {
        before(function () {
            this.cred = new this.factory.classes.Cred({ "username": "adam" });
            this.gm = new this.factory.classes.GameModel({
                "modelName": "My Model",
                "owner": this.cred,
                "rounds": [{
                    col: [{}]
                }]
            });
        });

        it("non-null sanity check", function () {
            console.log("this.gm", this.gm);
            assert.ok(this.gm);
        });
    });

    // Nested objects are reflected objects not implicitly create with new, rather
    // they are created from a pojo and examining the model the determine the type.
    describe("assign nested object", function () {
        before(function () {
            this.cred = new this.factory.classes.Cred({ "username": "adam" });
        });

        it("is set locally", function () {
            console.log("this.c1", this.c1);
        });
    });

    describe("deleting an object will delete all array indices", function () {
        before(function () {
            // this.factory.options = { verbose: console.log }
            this.adam = new this.factory.classes.Cred({ "username": "zander" });
            this.eve = new this.factory.classes.Cred({ "username": "eve" });
            this.adam.friends.push(this.eve);
            this.adam.$delete();
        });

        it("sanity check - user deleted", function () {
            const cred = this.factory.classes.Cred.get({ "username": "zander" });
            console.log(this.factory.classes.Cred.model);
            console.log(cred);
            assert.ok(!cred);
        });

        it("db indices deleted", function () {
            const table = this.factory.classes.Cred.tableName;
            const all = this.factory.prepare(`SELECT * FROM ${table} WHERE idx = ?`).all(this.adam.idx);
            assert.strictEqual(all.length, 0);
        });        
    });

    // describe("x", function () {
    //     before(function () {
    //         this.c1 = new this.factory.classes.Cred({ "username": "billy" });

    //         this.gm1 = new this.factory.classes.GameModel({
    //             "modelname": "my model",
    //             "owner": this.c1
    //         });

    //         this.gm1.rounds.push({ "col": [] });
    //     });

    //     it("is set locally", function () {

    //     });        
    // });  

    // describe("x", function () {
    //     before(function () {
    //         this.c1 = new this.factory.classes.Cred({ "username": "billy" });

    //         this.gm1 = new this.factory.classes.GameModel({
    //             "modelname": "my model",
    //             "owner": this.c1
    //         });

    //         this.gm1.rounds.push({ "col": [] });
    //     });

    //     it("is set locally", function () {

    //     });        
    // });    
});
