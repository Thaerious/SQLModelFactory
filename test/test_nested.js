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
setupTests(models, "Test nested classes", function () {
    describe("deleting an instance deletes instance of nested classes", function () {
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

        describe("do delete", function () {
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
});
