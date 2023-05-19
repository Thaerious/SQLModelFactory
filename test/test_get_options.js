import assert from "assert";
import ModelFactory from "../src/ModelFactory.js";
import setupTests from "./util/setup.js";
import logger from "../src/logger/setupLogger.js";

const models = {
    "Cred": {
        "name": "VARCHAR(64)",
        "age": "INTEGER"
    }
}

setupTests(models, "Test the options object on BaseClass.get", function () {
    describe("using 'new:true' will return a new object, not the previoulsy instantiated one", function () {        
        describe("test retriving by value", function () {
            before(function () {
                this.c1 = new this.classes.Cred({ "name": "billy", "age": "7" });
                this.c2 = this.classes.Cred.get({ "name": "billy" }, { new: true });
            });

            after(function () {
                this.c1.delete();
            });
        
            it("second one still matches values from frist", function () {
                assert.strictEqual(this.c1.name, this.c2.name);
                assert.strictEqual(this.c1.age, this.c2.age);
            });

            it("changing the value on one does not change the value on the other", function () {
                this.c1.name = "robert";
                this.c2.age = 9;

                assert.notStrictEqual(this.c1.name, this.c2.name);
                assert.notStrictEqual(this.c1.age, this.c2.age);
            });
        
            it("retrieving the object again will have both changes", function () {
                this.c3 = this.classes.Cred.get({ name: "robert" }, { new: true });
                assert.notStrictEqual(this.c3.name, this.c2.name);
                assert.notStrictEqual(this.c3.age, this.c1.age);
            });

            it("further get's without new return the latest object", function () {
                this.c4 = this.classes.Cred.get({ name: "robert" });
                assert.strictEqual(this.c4, this.c3);
            });
        });

        describe("test retriving by index", function () {
            before(function () {
                this.c1 = new this.classes.Cred({ "name": "billy", "age": "7" });
                this.c2 = this.classes.Cred.get(this.c1.idx, { new: true });
            });
        
            after(function () {
                this.c1.delete();
            });

            it("second one still matches values from frist", function () {
                assert.strictEqual(this.c1.name, this.c2.name);
                assert.strictEqual(this.c1.age, this.c2.age);
            });

            it("changing the value on one does not change the value on the other", function () {
                this.c1.name = "robert";
                this.c2.age = 9;

                assert.notStrictEqual(this.c1.name, this.c2.name);
                assert.notStrictEqual(this.c1.age, this.c2.age);
            });
        
            it("retrieving the object again will have both changes", function () {
                this.c3 = this.classes.Cred.get(this.c1.idx, { new: true });
                assert.notStrictEqual(this.c3.name, this.c2.name);
                assert.notStrictEqual(this.c3.age, this.c1.age);
            });

            it("further get's without new return the latest object", function () {
                this.c4 = this.classes.Cred.get(this.c1.idx);
                assert.strictEqual(this.c4, this.c3);
            });            
        });        
    });
});