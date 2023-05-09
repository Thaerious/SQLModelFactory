import ModelFactory, { expandModels } from "../../src/ModelFactory.js";
import { mkdirif } from "@thaerious/utility";

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

ModelFactory.instance.dbFile = "test/assets/test.db";
const classes = ModelFactory.instance.createClasses(models);
ModelFactory.instance.createTables();
const factory = ModelFactory.instance;

const steve = new classes.Cred({
    games: [
        { name: "steve's first game" },
        { name: "steve's second game" },
    ]
});

const bill = new classes.Cred({
    games: [
        steve.games[0]
    ]
});

const charlie = new classes.Cred({
    name: steve.name,
    games: [
        { name: "steve 2's first game" },
        { name: "steve 2's second game" },
    ]
});

ModelFactory.instance.options = { verbose: console.log };
steve.$delete();

console.log(classes.Cred.all());