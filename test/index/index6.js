import ModelFactory, { expandModels } from "../../src/ModelFactory.js";
import { mkdirif } from "@thaerious/utility";

const models = {
    "GameModel": {
        "modelname": "VARCHAR(32)",
        "owner": "@Cred",
        "rounds": [{            
            "col": [{
                "category": "VARCHAR(64)",                
            }]
        }]
    },
    "Cred": {
        "username": "VARCHAR(32)"
    }
}

const factory = ModelFactory.instance;
factory.dbFile = "test/assets/test.db";
factory.createClasses(models);
factory.createTables();

const cred = new factory.classes.Cred({ "username": "adam" });
const gm = new factory.classes.GameModel({
    "modelName": "My Model",
    "owner": cred,
    "rounds": [{
        col: {}
    }]
});