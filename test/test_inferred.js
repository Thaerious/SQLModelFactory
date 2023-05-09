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

// An inferred class is any class was declared as a value of another class.
setupTests(models, "Test inferred classes", function () {
    describe("deleting an instance deletes instance of inferred classes", function () {
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
                    { name: "steve's first game" },
                    { name: "steve's second game" },
                ]
            });

            this.factory.options = {verbose : console.log}
            this.steve.$delete();
        });

        it("inferred field values deleted", function () {
            const all = this.cred.name.constructor.all();
            console.table(all);
            assert.strictEqual(all.length, 1);
        });

        it("inferred array values deleted", function () {
            const table = classNameFromModel(this.cred.model.games).toLowerCase();
            const all = this.factory.prepare(`SELECT * FROM ${table}`).all();
            assert.strictEqual(all.length, 0);
        });        
    });
});
