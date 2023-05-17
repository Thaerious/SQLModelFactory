import assert from "assert";
import ParseArgs from "@thaerious/parseargs";
import Model from "../src/Model.js";

const args = new ParseArgs().run();

const models = {
    "Game": {
        "name" : "VARCHAR(64)"
    },
    "Cred": {
        "email": "VARCHAR(64)",
        "name": {
            "first": "VARCHAR(64)",
            "last": "VARCHAR(64)"
        },
        "game": "@Game",
        "friends": ["@Cred"],
        "also_friends": "[]@Cred",
        "alias": [{
            "street": "VARCHAR(64)"
        }]
    }
}

// A nested class is any class was declared as a value of another class.
describe("test model class functionality", function () {
    before(function () {
        this.models = new Model(models);
    });

    describe("on root", function () {
        describe("primitive", function () {
            before(function () {
                this.target = this.models.Cred.email;
            });

            it("check value", function () {
                assert.strictEqual(
                    this.target.value,
                    "VARCHAR(64)"
                );
            });

            it("deRef error", function () {
                let thrown = false;
                try {
                    this.target.deRef();
                } catch {
                    thrown = true;
                }

                assert.ok(thrown);
            });

            it("is array", function () {
                assert.ok(!this.target.isArray());
            });

            it("is reference", function () {
                assert.ok(!this.target.isReference());
            });

            it("is primitive", function () {
                assert.ok(this.target.isPrimitive());
            });

            it("is nested", function () {
                assert.ok(!this.target.isNested());
            });
        });

        describe("referenced object", function () {
            before(function () {
                this.target = this.models.Cred.game;
            });

            it("check value", function () {
                assert.strictEqual(
                    this.target.value,
                    "@Game"
                );
            });

            it("deRef", function () {
                assert.strictEqual(
                    this.target.deRef(),
                    this.models.Game
                );
            });

            it("is array", function () {
                assert.ok(!this.target.isArray());
            });

            it("is reference", function () {
                assert.ok(this.target.isReference());
            });

            it("is primitive", function () {
                assert.ok(!this.target.isPrimitive());
            });

            it("is nested", function () {
                assert.ok(!this.target.isNested());
            });
        });       
        
        describe("referenced array", function () {
            before(function () {
                this.target = this.models.Cred.friends;
            });

            it("check value", function () {
                assert.strictEqual(
                    this.target.value,
                    "[]Cred"
                );
            });

            it("deRef", function () {
                assert.strictEqual(
                    this.target.deRef(),
                    this.models.Cred
                );
            });

            it("is array", function () {
                assert.ok(this.target.isArray());
            });

            it("is reference", function () {
                assert.ok(!this.target.isReference());
            });

            it("is primitive", function () {
                assert.ok(!this.target.isPrimitive());
            });

            it("is nested", function () {
                assert.ok(!this.target.isNested());
            });
        });  

        describe("nested object", function () {
            before(function () {
                this.target = this.models.Cred.name;
            });

            it("check value", function () {
                assert.strictEqual(
                    this.target.value,
                    "@_t0"
                );
            });

            it("deRef", function () {
                assert.strictEqual(
                    this.target.deRef(),
                    this.models["_t0"]
                );
            });

            it("is array", function () {
                assert.ok(!this.target.isArray());
            });

            it("is reference", function () {
                assert.ok(this.target.isReference());
            });

            it("is primitive", function () {
                assert.ok(!this.target.isPrimitive());
            });

            it("is nested", function () {
                assert.ok(this.target.isNested());
            });
        });    
        
        describe("nested array", function () {
            before(function () {
                this.target = this.models.Cred.alias;
            });

            it("check value", function () {
                assert.strictEqual(
                    this.target.value,
                    "[]_t1"
                );
            });

            it("deRef", function () {
                assert.strictEqual(
                    this.target.deRef(),
                    this.models["_t1"]
                );
            });

            it("is array", function () {
                assert.ok(this.target.isArray());
            });

            it("is reference", function () {
                assert.ok(!this.target.isReference());
            });

            it("is primitive", function () {
                assert.ok(!this.target.isPrimitive());
            });

            it("is nested", function () {
                assert.ok(this.target.isNested());
            });
        });        
    });
});
