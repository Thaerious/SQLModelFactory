import assert from "assert";
import Model from "../../src/Model.js";

const models = {
    "Game": {
        "name": "VARCHAR(64)"
    },
    "Cred": {
        "email": "VARCHAR(64) NOT NULL",
        "name": {
            "first": "VARCHAR(64)",
            "last": "VARCHAR(64)"
        },
        "game": "@Game",
        "friends": ["@Cred"],
        "alias": [{
            "street": "VARCHAR(64)"
        }],
        "$append": [
            "apple",
            "pear"
        ]
    }
};

(function () {
    this.models = new Model(models);
    this.target = this.models.Cred.alias;

    for (const field of this.models.Cred) {
        console.log(field + "");
    }
    
    for (const e of this.models.Cred.$append) {
        console.log(e);
    }    

}.bind({}))()

