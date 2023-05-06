import ModelFactory, {expandModels} from "../../src/ModelFactory.js";
import { mkdirif } from "@thaerious/utility";

const models = expandModels({
    "GameModel": {
         "modelname": "VARCHAR(32) NOT NULL",
        "owner": {
            "name": "VARCHAR(32) NOT NULL",
            "email": "VARCHAR(32) NOT NULL"
        },
         "rounds": [{            
             "col": [{
                 "category": "VARCHAR(64) NOT NULL",
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
     }
});
 
console.log(models);

const DBPATH = mkdirif("test", "assets", "test.db");
ModelFactory.instance.dbFile = DBPATH;
ModelFactory.instance.options = {};

const classes = ModelFactory.instance.createClasses(models);
ModelFactory.instance.createTables();

const gm = new classes.GameModel({ modelname: "my model" });
gm.owner = { name: "billy", email: "billy@mail.com" };
console.log(gm);

