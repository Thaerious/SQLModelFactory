import ModelFactory, { expandModels } from "../../src/ModelFactory.js";
import { mkdirif } from "@thaerious/utility";

const models = {
    "GameModel": {
        "groups": [{
            "label": "VARCHAR(64)",
            names: [{
                "first": "VARCHAR(64)",
                "last": "VARCHAR(64)"
            }]
        }],
    }
}

ModelFactory.instance.dbFile = "test/assets/test.db";
ModelFactory.instance.createClasses(models);
ModelFactory.instance.createTables();

ModelFactory.instance.options = { verbose: console.log };

const gm1 = new ModelFactory.instance.classes.GameModel();
// const gm2 = new ModelFactory.instance.classes.GameModel();
// const gm3 = new ModelFactory.instance.classes.GameModel();

// const names = new ModelFactory.instance.classes._t0();
// console.log(names);

gm1.groups.push({
    names: [
        { "first": "bill", "last": "billers" }
    ]
});

console.log(gm1);
console.log(gm1.groups);
console.log(gm1.groups[0]);

// console.log(gm2);
// console.log(gm3);




