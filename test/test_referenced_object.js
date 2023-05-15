import assert from "assert";
import ParseArgs from "@thaerious/parseargs";
import setupTests from "./util/setup.js";
import { classNameFromModel } from "../src/extractClass.js";

const args = new ParseArgs().run();

const models = {
    "Name": {
        "first": "VARCHAR(64)",
        "last": "VARCHAR(64)",
    },
    "Person": {
        "name": "@Name",
        "partner": "@Person"
    }
}

setupTests(models, "Construct empty objects", function () {
    describe("create objects", function () {
        before(function () {
            this.steve = new this.classes.Person({});
            this.bill = new this.classes.Person({});
        });

        it("sanity check", function () {
            assert.ok(this.steve);
            assert.ok(this.bill);
        });

        it("row values match objects (all empty)", function () {
            this.factory.reset();
            const tablename = this.classes.Person.tablename;

            const steve = this.classes.Person.get(this.steve.idx);
            const bill = this.classes.Person.get(this.bill.idx);

            assert.strictEqual(steve.name, undefined);
            assert.strictEqual(steve.partner, undefined);
            assert.strictEqual(bill.name, undefined);
            assert.strictEqual(bill.partner, undefined);
        });
    });
});

setupTests(models, "Fill in by object", function () {
    before(function () {
        this.steve = new this.classes.Person({});
        this.bill = new this.classes.Person({});

        this.steve = this.classes.Person.get(this.steve.idx);
        this.bill = this.classes.Person.get(this.bill.idx);

        this.steve.partner = this.bill;

        console.log(this.steve.partner);
    });

    it("value is assigned in object", function () {
        assert.strictEqual(this.steve.partner, this.bill);
    });
});