import assert from "assert";
import ParseArgs from "@thaerious/parseargs";
import setupTests from "./util/setup.js";

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

// A nested class is any class was declared as a value of another class.
setupTests(models, "test nested objects", function () {
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
            const NameClass = this.bill.name.constructor;
            const all = NameClass.all();
            assert.strictEqual(all.length, 2);
        });

        it("check nested array row count", function () {
            const GamesClass = this.bill.games[0].constructor;
            const all = GamesClass.all();
            assert.strictEqual(all.length, 4);
        });
    });

    describe("delete a root object", function () {
        before(function () {
            this.steve.$delete();
        });

        it("nested field values from the deleted object are also deleted from the DB", function () {
            const NameClass = this.bill.name.constructor;
            const all = NameClass.all();
            assert.strictEqual(all.length, 1);
        });

        it("nested array values from the deleted object are also deleted from the DB", function () {
            const GamesClass = this.bill.games[0].constructor;
            const all = GamesClass.all();
            assert.strictEqual(all.length, 2);
        });
    });
});

setupTests(models, "deleting a nested object field", function () {
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

    describe("delete the nested object field", function () {
        before(function () {
            this.NameClass = this.steve.name.constructor;
            delete this.steve.name;
        });

        it("removed from the object", function () {
            delete this.steve.name;
            assert.strictEqual(this.steve.name, undefined);
        });

        it("removed from the DB", function () {
            const all = this.NameClass.all();
            assert.strictEqual(all.length, 0);
        });

        it("returns true on second delete (in line with standard functionality)", function () {
            assert.ok(delete this.steve.name);
        });
    });
});

setupTests(models, "[*] set nested object field to undefined", function () {
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

    describe("delete the nested object field", function () {
        before(function () {
            this.NameClass = this.steve.name.constructor;
            this.factory.options = {verbose : console.log}
            this.steve.name = undefined;
        });

        it("removed from the object", function () {
            delete this.steve.name;
            assert.strictEqual(this.steve.name, undefined);
        });

        it("removed from the DB", function () {
            const all = this.NameClass.all();
            assert.strictEqual(all.length, 0);
        });

        it("returns true on second delete (in line with standard functionality)", function () {
            assert.ok(delete this.steve.name);
        });
    });
});

setupTests(models, "deleting a nested array value", function () {
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
    });
});
