import ModelFactory, { expandModels } from "../../src/ModelFactory.js";
import { mkdirif } from "@thaerious/utility";

const models = {
    "Cred": {
        "name": {
            "first": "VARCHAR(64)",
            "last": "VARCHAR(64)"
        },
        "nicknames": [{
            "name": "VARCHAR(64)"
        }]
    }
}

ModelFactory.instance.dbFile = "test/assets/test.db";
const classes = ModelFactory.instance.createClasses(models);
ModelFactory.instance.createTables();
const factory = ModelFactory.instance;

const steve = new classes.Cred({
    name: {
        first: "steve",
        last: "mcqueen"
    },
    nicknames: [
        { name: "queenie" }
    ]
});

// console.log("models", factory.models);
// console.log("\n");

factory.options = { verbose: console.log };
console.log(steve);
steve.$delete();