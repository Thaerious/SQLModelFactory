import assert from "assert";
import path from "path";
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
        "friends": ["@Cred"]
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

    after(function () {
        if (!args.flags["no-clean"]) {
            if (fs.existsSync(DBPATH)) {
                console.log(`After: Removing database '${DBPATH}'`);
                fs.rmSync(DBPATH, { recursive: true });
            }
        }
    });

    describe("create model classes", function () {
        before(function () {
            this.factory = new ModelFactory(DBPATH, { /*verbose: console.log*/ });
            this.classes = this.factory.createClasses(models);
        });

        after(function () {
            this.factory.close();
        });

        it("classes were created", function () {
            assert.ok(this.classes.Game);
            assert.ok(this.classes.Cred);
        });

        describe("create tables", function () {
            before(function () {
                this.classes.Game.createTables();
                this.classes.Cred.createTables();
            });

            it("tables were created", function () {
                const tables =
                    this.factory.prepare("select name from sqlite_master where type='table'")
                        .all()
                        .map(row => row.name);

                assert.ok(tables.indexOf("game") !== -1);
                assert.ok(tables.indexOf("cred_friends") !== -1);
                assert.ok(tables.indexOf("cred") !== -1);
            });
        });
    });

    describe("instantiate", function () {
        before(function () {
            this.factory = new ModelFactory(DBPATH, { /* verbose: console.log */ });
            this.classes = this.factory.createClasses(models);
            this.classes.Game.createTables();
            this.classes.Cred.createTables();
        });

        after(function () {
            this.factory.close();
        });

        describe("instantiate with data", function () {
            before(function () {
                this.abdul = new this.classes.Cred({ username: "abdul", email: "abdul@email.com" });
            });

            it("check sql db", function () {
                const row = this.factory.prepare("SELECT * FROM cred WHERE idx = ?").get(this.abdul.idx);
                assert.strictEqual(row.username, "abdul");
                assert.ok(row);
            });

            it("returned object is not null", function () {
                assert.ok(this.abdul);
            });

            it("can be retrieved by index with $get", function () {
                assert.ok(this.classes.Cred.get(this.abdul.idx));
                assert.strictEqual(this.abdul, this.classes.Cred.get(this.abdul.idx));
            });

            it("can be retrieved by index with $all", function () {
                const all = this.classes.Cred.all(this.abdul.idx);
                assert.strictEqual(all[0], this.abdul);
            });

            describe("check that new factory retrieves objects (not the same as other factory)", function () {
                before(function () {
                    this.factory = new ModelFactory(DBPATH, { /* verbose: console.log */ });
                    this.classes = this.factory.createClasses(models);
                    this.classes.Game.createTables();
                    this.classes.Cred.createTables();

                    this.abdul2 = this.classes.Cred.get(this.abdul.idx);
                });

                after(function () {
                    this.factory.close();
                });

                it("can be retrieved by index with $get", function () {
                    assert.ok(this.classes.Cred.get(this.abdul.idx));
                });

                it("can be retrieved by index with $all", function () {
                    const all = this.classes.Cred.all(this.abdul.idx);
                    assert.ok(all[0]);
                });
            });
        });

        describe("instantiate without data", function () {
            before(function () {
                this.noname = new this.classes.Cred();
            });

            it("returned object is not null", function () {
                assert.ok(this.noname);
            });

            it("check sql db", function () {
                const row = this.factory.prepare("SELECT * FROM cred WHERE idx = ?").get(this.noname.idx);
                console.log("row", row);
                assert.ok(row);
            });
        });
    });

    describe("insert data", function () {
        before(function () {
            this.factory = new ModelFactory(DBPATH, { /*verbose: console.log*/ });
            this.classes = this.factory.createClasses(models);
            this.classes.Game.createTables();
            this.classes.Cred.createTables();
        });

        after(function () {
            this.factory.close();
        });

        describe("create credentials data", function () {
            before(function () {
                this.cred = new this.classes.Cred({ username: "adam", email: "adam@eden.com" });
            });

            it("returned object is not null", function () {
                assert.ok(this.cred);
            });

            it("can retrieve entry by value", function () {
                const cred = this.classes.Cred.get({ username: "adam" });
                assert.ok(cred);
            });

            it("can retrieve entry by index", function () {
                const cred = this.classes.Cred.get(this.cred.idx);
                assert.ok(cred);
            });
        });
    });

    describe("manipulate data", function () {
        before(function () {
            this.factory = new ModelFactory(DBPATH, { /*verbose: console.log*/ });
            this.classes = this.factory.createClasses(models);
            this.classes.Game.createTables();
            this.classes.Cred.createTables();
            this.eve = new this.classes.Cred({ username: "eve", email: "eve@eden.com" });
            this.cain = new this.classes.Cred({ username: "cain", email: "cain@eden.com" });
            this.game = new this.classes.Game({ name: "eve's game" });
        });

        after(function () {
            this.factory.close();
        });

        describe("assign string value to field", function () {
            before(function () {
                this.eve.email = "new@email.com";
            });

            it("value changed on object", function () {
                assert.strictEqual(this.eve.email, "new@email.com");
            });

            it("value changed on new object with the same reference", function () {
                const actual = this.classes.Cred.get(this.eve.idx);
                assert.strictEqual(actual.email, "new@email.com");
            });
        });

        describe("assign object value to field", function () {
            before(function () {
                this.eve.game = this.game;
            });

            it("value changed on object", function () {
                assert.strictEqual(this.eve.game, this.game);
            });

            it("value changed on new object with the same reference", function () {
                const actual = this.classes.Cred.get(this.eve.idx);
                assert.strictEqual(actual.game, this.game);
            });

            it("retrieved objects with the same sql reference are the same", function () {
                const actual = this.classes.Cred.get(this.eve.idx);
                assert.strictEqual(actual, this.eve);
            });

            it("changing value in one object changes it in all objects with the same sql reference", function () {
                const actual = this.classes.Cred.get(this.eve.idx);
                this.eve.email = "eve@email.com"
                assert.strictEqual(actual.email, this.eve.email);
            });
        });

        describe("add value to array field", function () {
            before(function () {
                this.eve.friends.push(this.cain);
                this.cain.friends.push(this.eve);
            });

            it("value changed on object", function () {
                assert.strictEqual(this.eve.friends[0], this.cain);
            });

            it("retrieved objects with the same sql reference are the same", function () {
                const actual = this.classes.Cred.get(this.eve.idx);
                assert.strictEqual(actual, this.eve);
            });

            describe("remove value from array field", function () {
                it("remove value in one object changes it in all objects with the same sql reference", function () {
                    const actual = this.classes.Cred.get(this.eve.idx);
                    this.eve.friends.pop();
                    assert.strictEqual(actual.friends, this.eve.friends);
                });
            });
        });
    });

    describe("delete instance", function () {
        before(function () {
            this.factory = new ModelFactory(DBPATH, { /*verbose: console.log*/ });
            this.classes = this.factory.createClasses(models);
            this.classes.Game.createTables();
            this.classes.Cred.createTables();
            this.marg = new this.classes.Cred({ username: "marg", email: "marg@eden.com" });
        });

        after(function () {
            this.factory.close();
        });

        it("pre-check exists", function () {
            assert.ok(this.marg);
            assert.ok(this.factory.prepare("SELECT * FROM cred WHERE idx = ?").get(this.marg.idx));
        });

        describe("do delete", function () {
            before(function () {
                this.marg.delete();
            });

            it("no longer exists in db", function () {
                const actual = this.factory.prepare("SELECT * FROM cred WHERE idx = ?").get(this.marg.idx)
                assert.ok(!actual);
            });

            it("get after deletions returns undefined", function () {
                const marg = this.classes.Cred.get(this.marg.idx);
                console.log("marg", marg);
                console.log("this.marg", this.marg);
                assert.strictEqual(marg, undefined);
            });
        });
    });

    describe("add reflected object to array field", function () {
        before(function () {
            this.factory = new ModelFactory(DBPATH, { /*verbose: console.log*/ });
            this.classes = this.factory.createClasses(models);
            this.classes.Game.createTables();
            this.classes.Cred.createTables();
            this.homer = new this.classes.Cred({ username: "homer", email: "homer@simpsons.com" });
            this.marge = new this.classes.Cred({ username: "marge", email: "marge@simpsons.com" });
            this.homer.friends[0] = this.marge;
        });

        after(function () {
            this.factory.close();
        });

        it("size of array is one", function () {
            assert.strictEqual(this.homer.friends.length, 1);
        });

        it("object retrieved from array is the one inserted", function () {
            assert.strictEqual(this.homer.friends[0], this.marge);
        });
    });

    describe("add un-reflected object to array field", function () {
        before(function () {
            this.factory = new ModelFactory(DBPATH, { /*verbose: console.log*/ });
            this.classes = this.factory.createClasses(models);
            this.classes.Game.createTables();
            this.classes.Cred.createTables();
            this.homer = new this.classes.Cred({ username: "homer", email: "homer@simpsons.com" });
        });

        after(function () {
            this.factory.close();
        });

        it("throws exception", function () {
            let caught = false;
            try {
                this.homer.friends[0] = "aString";
            } catch {
                caught = true;
            }
            assert.ok(caught);
        });
    });

    describe("close an unopened instance", function () {
        before(function () {
            this.factory = new ModelFactory(DBPATH, { /*verbose: console.log*/ });
        });

        it("does nothing", function () {
            this.factory.close();
        });

    });   

    describe("retrieve singlton instance", function () {
        before(function () {
            this.factory = ModelFactory.instance(DBPATH, { /*verbose: console.log*/ });
        });

        after(function () {
            this.factory.close();
        });

        it("is not null", function () {
            assert.ok(this.factory);
        });

    });    

});