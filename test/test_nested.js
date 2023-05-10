import assert from "assert";
import ParseArgs from "@thaerious/parseargs";
import setupTests from "./util/setup.js";
import { classNameFromModel } from "../src/extractClass.js";

const args = new ParseArgs().run();

const models = {
    "Cred": {
        "name": {
            "first": "VARCHAR(64)",
            "last": "VARCHAR(64)"
        },
        "games": [{
            "name": "VARCHAR(32)",
        }],
    }
}

// An nested class is any class was declared as a value of another class.
setupTests(models, "deleting an instance removes all nested instances from the DB", function () {
    before(function () {
        this.steve = new this.classes.Cred({
            name: {
                first: "steve",
                last: "steverson"
            },
            games: [
                { name: "steve's first game" },
                { name: "steve's second game" },
            ]
        });

        this.bill = new this.classes.Cred({
            name: {
                first: "bill",
                last: "billerson"
            },
            games: [
                { name: "bill's first game" },
                { name: "bill's second game" },
            ]
        });
    });

    describe("before delete", function () {
        it("check nested field row count", function () {
            const nestedClass = this.bill.name.constructor;
            const all = nestedClass.all();
            assert.strictEqual(all.length, 2);
        });

        it("check nested array row count", function () {
            const nestedClass = this.bill.games[0].constructor;
            const all = nestedClass.all();
            assert.strictEqual(all.length, 4);
        });
    });

    describe("delete the root object", function () {
        before(function () {
            this.steve.$delete();
        });

        it("nested field values deleted", function () {
            const nestedClass = this.bill.name.constructor;
            const all = nestedClass.all();
            assert.strictEqual(all.length, 1);
        });

        it("nested array values deleted", function () {
            const nestedClass = this.bill.games[0].constructor;
            const all = nestedClass.all();
            assert.strictEqual(all.length, 2);
        });
    });
});

setupTests(models, "[2] deleting a nested field", function () {
    before(function () {
        console.log(this.factory.models);
        this.steve = new this.classes.Cred({
            name: {
                first: "steve",
                last: "steverson"
            },
            games: [
                { name: "steve's first game" },
                { name: "steve's second game" },
            ]
        });
    });

    describe("delete the nested object field", function () {
        before(function () {
            this.nameConstructor = this.steve.name.constructor;
            this.factory.options = {verbose : console.log}
            delete this.steve.name;
            console.log(this.steve);
        });

        it("removed from the object", function () {
            delete this.steve.name;
            assert.strictEqual(this.steve.name, undefined);
        });

        it("removed from the DB", function () {
            const all = this.nameConstructor.all();
            assert.strictEqual(all.length, 0);
        });        

        it("returns true on second delete", function () {
            assert.ok(delete this.steve.name);
        });
    });
});

setupTests(models, "[3] deleting a nested array value", function () {
    before(function () {
        this.steve = new this.classes.Cred({
            name: {
                first: "steve",
                last: "steverson"
            },
            games: [
                { name: "steve's first game" },
                { name: "steve's second game" },
            ]
        });
    });

    describe("delete the nested array value", function () {
        before(function () {            
            this.factory.options = {verbose : console.log}
            delete this.steve.games[0];
        });

        it("removed from the object", function () {
            assert.strictEqual(this.steve.games[0], undefined);
        });

        it("removed from the DB item table", function () {
            const all = this.steve.games.$constructor.all();
            assert.strictEqual(all.length, 1);
        });

        it("removed from the DB index table", function () {
            const model = this.factory.getModel(this.steve.games.model);
            const all = this.factory.prepare(
                `SELECT * FROM ${model.$indexTable} WHERE ridx = ?`
            ).all(this.steve.idx);

            assert.strictEqual(all.length, 1);
        });

        // it("returns true on second delete", function () {
        //     assert.ok(delete this.steve.games[0]);
        // });
    });
});
