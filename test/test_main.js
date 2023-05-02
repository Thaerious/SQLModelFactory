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
            this.factory = new ModelFactory(DBPATH, { /* verbose: console.log */ });
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
                try {
                    this.classes.Game.createTables();
                    this.classes.Cred.createTables();
                } catch (err) {
                    console.log(err);
                }
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
                try {
                    this.abdul = new this.classes.Cred({ username: "abdul", email: "abdul@email.com" });
                } catch (err) {
                    console.log(err);
                }
            });

            it("check sql db", function () {
                try {
                    const row = this.factory.prepare("SELECT * FROM cred WHERE idx = ?").get(this.abdul.idx);
                    assert.strictEqual(row.username, "abdul");
                    assert.ok(row);
                } catch (err) {
                    console.log(err);
                }
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

                it("can be retrieved with the constructor", function () {
                    assert.ok(new this.classes.Cred(this.abdul.idx));
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
                assert.ok(row);
            });
        });

        describe("intatiante with foreign reference data", function () {
            before(function () {
                const game = new this.classes.Game({ name: "monica's game"});
                this.monica = new this.classes.Cred({
                    username: "monica",
                    email: "monica@email.com",
                    game: game
                });
            });

            it("returned object is not null", function () {
                assert.strictEqual(this.monica.game.name, "monica's game");
                assert.ok(this.monica);
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
            this.factory = new ModelFactory(DBPATH, { /*verbose: console.log*/ });
        });

        after(function () {
            this.factory.close();
        });

        it("is not null", function () {
            assert.ok(this.factory);
        });

    });

    describe("Model factory catches SQL errors as ModelFactoryError", function () {
        before(function () {
            this.factory = new ModelFactory(DBPATH, { /*verbose: console.log*/ });
        });

        after(function () {
            this.factory.close();
        });

        it("throws an error on malformed SQL", function () {
            let caughtError = null;

            try {
                this.factory.prepare("garbage string");
            } catch (err) {
                caughtError = err;
            }

            assert.ok(caughtError);
        });
    });

    describe("#ClassFactoryError : Retrieving an unknown index with the constructor throws an Error", function () {
        before(function () {
            this.factory = new ModelFactory(DBPATH, { /*verbose: console.log*/ });
            this.classes = this.factory.createClasses(models);
            this.classes.Game.createTables();
            this.classes.Cred.createTables();
        });

        after(function () {
            this.factory.close();
        });

        it("throws the error", function () {
            let caughtError = null;

            try {
                new this.classes.Cred(99);
            } catch (err) {
                caughtError = err;
            }

            assert.ok(caughtError);
        });
    });

    describe("invoking #all without parameters retrieves all rows ", function () {
        before(function () {
            try {
                this.factory = new ModelFactory(DBPATH, { /*verbose: console.log*/ });
                this.classes = this.factory.createClasses(models);

                this.factory.prepare(`DELETE FROM cred_friends`).run();
                this.factory.prepare(`DELETE FROM cred`).run();
                this.factory.prepare(`DELETE FROM game`).run();

                this.classes.Game.createTables();
                this.classes.Cred.createTables();
                this.morticia = new this.classes.Cred({ username: "morticia", email: "morticia@adams.com" });
                this.wednesday = new this.classes.Cred({ username: "wednesday", email: "wednesday@adams.com" });
                this.gomez = new this.classes.Cred({ username: "gomez", email: "gomez@adams.com" });
            } catch (err) {
                console.log(err);
            }
        });

        after(function () {
            this.factory.close();
        });

        it("calling #all retrieves all 3 entries", function () {
            const all = this.classes.Cred.all();
            assert.strictEqual(all.length, 3);
        });
    });

    describe("retrieve a persistant object", function () {
        before(function () {
            try {
                const factory = new ModelFactory(DBPATH, { /* verbose: console.log */ });
                factory.createClasses(models);
                factory.classes.Game.createTables();
                factory.classes.Cred.createTables();

                const eve = new factory.classes.Cred({ username: "eve", email: "eve@eden.com" });
                const cain = new factory.classes.Cred({ username: "cain", email: "cain@eden.com" });
                const game = new factory.classes.Game({ name: "eve's game" });
                eve.game = game;
                eve.friends.push(cain);

                factory.close();
            } catch (err) {
                console.log(err);
            }
        });

        describe("retrieve the persistant object", function () {
            it("exists (not undefined/null)", function () {
                const factory = new ModelFactory(DBPATH, { /* verbose: console.log */ });
                factory.createClasses(models);

                const eve = factory.classes.Cred.get({ username: "eve" });
                assert.ok(eve);
                factory.close();
            });

            it("array (friends) of peristant object contains 1 element", function () {
                const factory = new ModelFactory(DBPATH, { /* verbose: console.log */ });
                factory.createClasses(models);

                const eve = factory.classes.Cred.get({ username: "eve" });
                assert.strictEqual(eve.friends.length, 1);
                factory.close();
            });

            it("external reference (game) of peristant object is not null", function () {
                const factory = new ModelFactory(DBPATH, { /* verbose: console.log */ });
                factory.createClasses(models);

                const eve = factory.classes.Cred.get({ username: "eve" });
                assert.ok(eve.game);
                factory.close();
            });

            describe("external reference (game) of peristant object is reflective", function () {
                before(function () {
                    this.factory = new ModelFactory(DBPATH, { /* verbose: console.log */ });
                    this.factory.createClasses(models);

                    const eve = this.factory.classes.Cred.get({ username: "eve" });
                    eve.game.name = "changed game name";
                });

                it("The DB row is updated for game", function () {
                    const row = this.factory.prepare("SELECT * FROM game WHERE name = 'changed game name'").get();
                    assert.strictEqual(row.name, "changed game name");
                });

                it("Retrieving the game has the new value", function () {
                    const game = this.factory.classes.Game.get({ name: "changed game name" });
                    assert.ok(game);
                });

                after(function () {
                    this.factory.close();
                });

            });
        });
    });
});