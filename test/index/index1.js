import assert from "assert";
import Model from "../../src/Model.js";

const models = {
    "Game": {
        "name": "VARCHAR(64)"
    },
    "Cred": {
        "email": "VARCHAR(64)",
        "name": {
            "first": "VARCHAR(64)",
            "last": "VARCHAR(64)"
        },
        "game": "@Game",
        "friends": ["@Cred"],
        "alias": [{
            "street": "VARCHAR(64)"
        }]
    }
};

(function(){
    this.models = new Model(models);
    this.target = this.models.Cred.alias;

    console.log(this.models);

    console.log("target", this.target.value);
    console.log("deref", this.target.deRef());

    assert.strictEqual(
        this.target.deRef(),
        this.models["_t1"]
    );    
}.bind({}))()

