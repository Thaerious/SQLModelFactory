import exp from "constants";
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

console.log("\n-------------------------------------\n");
const expanded = expandModels(models);
console.log(expanded.Cred.value);
console.log(expanded.Cred.value.type);
console.log("\n-------------------------------------\n");
