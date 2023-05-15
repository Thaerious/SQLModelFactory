import { mkdirif } from "@thaerious/utility";
import ModelFactory from "../../src/ModelFactory.js";
import assert from "assert";

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

const DBPATH = mkdirif("test", "assets", "test.db");
const factory = new ModelFactory(DBPATH, {verbose : console.log});
const { Name, Person } = factory.createClasses(models);
factory.createTables();

const steve = new Person({});
const bill = new Person({});

steve.partner = bill;

factory.reset();
const steve2 = Person.get(steve.idx);
const bill2 = Person.get(bill.idx);

console.log("partner", steve2.partner);
