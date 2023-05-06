import ModelFactory, {expandModels} from "../../src/ModelFactory.js";
import { mkdirif } from "@thaerious/utility";

const models = expandModels({
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
});
 
console.log(models);
