import ModelFactory, { expandModels } from "../../src/ModelFactory.js";
import { mkdirif } from "@thaerious/utility";
import createTable from "../../src/createTable.js";

const models = {
    "Address": {
        "city": "VARCHAR(64)"
    },
    "Cred": {
        "value1": "VARCHAR(64)",
        "value2": "VARCHAR(64)",
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
factory.createClasses(models);
factory.createTables();

console.log("before ------ ");
console.log(factory.models);
console.log(Object.keys(factory.classes));
console.log(" ------------ ");



