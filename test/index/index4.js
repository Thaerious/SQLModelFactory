import { mkdirif } from "@thaerious/utility";
import ModelFactory from "../../src/ModelFactory.js";

const models = {
    "GameModel": {
        "modelname": "VARCHAR(32)",
        "owner": "@Cred",
        "rounds": [{
            "col": [{
                "category": "VARCHAR(64)",
                "row": [{
                    "value": "INTEGER",
                    "question": "VARCHAR(256)",
                    "answer": "VARCHAR(256)",
                }]
            }]
        }],
        "$append": [
            "UNIQUE(modelname, owner)"
        ]
    },
    "Cred": {
        "username": "VARCHAR(32)",
        "email": "VARCHAR(64)",
        "created": "DATE DEFAULT (datetime('now','localtime'))",
        "games": ["@GameModel"],
        "friends": ["@Cred"]
    }
}

const DBPATH = mkdirif("test", "assets", "test.db");
const factory = new ModelFactory(DBPATH, {});
const { Game, Cred } = factory.createClasses(models);
factory.createTables();

// console.log(factory.models);
console.log(factory.models.GameModel);
console.log(factory.models.GameModel.owner);