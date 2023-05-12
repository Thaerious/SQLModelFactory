import ModelFactory, { expandModels } from "../../src/ModelFactory.js";
import { mkdirif } from "@thaerious/utility";
import createTable from "../../src/createTable.js";

const models = {
    "Address": {
        "city": "VARCHAR(64)"
    },
    "Cred": {
        "value": "VARCHAR(64)",
        "name": {
            "first": "VARCHAR(64)",
            "last": "VARCHAR(64)"
        },
        "games": [{
            "name": "VARCHAR(32)",
        }],
        "home": "@Address",  
        "friends": ["@Cred"],        
    }
}

const factory = ModelFactory.instance;
factory.options = { verbose: console.log };
factory.dbFile = "test/assets/test.db";

const expanded = expandModels(models);
console.log(expanded.Cred.$);
console.log(expanded.Cred.$append);

for (const name in expanded) {
    createTable(factory, expanded[name]);
}

// createTable(factory, factory.models._t0);
// createTable(factory, factory.models._t1);
