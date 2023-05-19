import assert from "assert";
import ParseArgs from "@thaerious/parseargs";
import setupTests from "./util/setup.js";

const args = new ParseArgs().run();

const models = {
    "Cred": {
        "name": "VARCHAR(64)",
        "age": "INTEGER"
    }
}

// An nested class is any class was declared as a value of another class.
setupTests(models, "Test object with only primitive values", function () {
    before(function () {
        this.steve = new this.classes.Cred({
            name: "steve",
            age: 30
        });
    });

    describe("check row in the db", function () {
        before(function () {
            const tablename = this.classes.Cred.model.$tablename;
            this.row = this.factory.prepare(`select * from ${tablename}`).get();
        });

        it("sanity check", function () {            
            assert.ok(this.row);
        });

        it("row values match object", function () {
            assert.strictEqual(this.row.name, this.steve.name);
            assert.strictEqual(this.row.age, this.steve.age);
        });
    });

    describe("change string value", function () {
        before(function () {
            this.steve.name = "steven";
        });

        it("object value updated", function () {            
            assert.strictEqual(this.steve.name, "steven");
        });

        it("row value updated", function () {
            const tablename = this.classes.Cred.model.$tablename;
            this.row = this.factory.prepare(`select * from ${tablename}`).get();            
            assert.strictEqual(this.row.name, "steven");
        });
    });  
    
    describe("change integer value", function () {
        before(function () {
            this.steve.age = 31;
        });

        it("object value updated", function () {            
            assert.strictEqual(this.steve.age, 31);
        });

        it("row value updated", function () {
            const tablename = this.classes.Cred.model.$tablename;
            this.row = this.factory.prepare(`select * from ${tablename}`).get();            
            assert.strictEqual(this.row.age, 31);
        });
    });  
    
    describe("delete string value", function () {
        before(function () {
            delete this.steve.name;
        });

        it("object value null", function () {            
            assert.strictEqual(this.steve.name, undefined);
        });

        it("row value null", function () {
            const tablename = this.classes.Cred.model.$tablename;
            this.row = this.factory.prepare(`select * from ${tablename}`).get();            
            assert.strictEqual(this.row.name, null);
        });
    });  
    
    describe("delete integer value", function () {
        before(function () {
            delete this.steve.age;
        });

        it("object value is null", function () {            
            assert.strictEqual(this.steve.age, undefined);
        });

        it("row value is null", function () {
            const tablename = this.classes.Cred.model.$tablename;
            this.row = this.factory.prepare(`select * from ${tablename}`).get();            
            assert.strictEqual(this.row.age, null);
        });
    });       
});
