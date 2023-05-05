import assert from "assert";
import {extractClass} from "../src/extractClass.js";

describe("Extract Reference Test : extractClass.js", function () {
    it("Reference only", function(){
        const extract = extractClass("ref", "@table");
        assert.strictEqual(extract.column, "INTEGER");
        assert.strictEqual(extract.foreignKey, "FOREIGN KEY (ref) REFERENCES table (idx)");
    });

    it("Reference at beinning", function(){
        const extract = extractClass("ref", "@table NOT NULL");
        assert.strictEqual(extract.column, "INTEGER NOT NULL");
        assert.strictEqual(extract.foreignKey, "FOREIGN KEY (ref) REFERENCES table (idx)");
    });   

    it("Reference at end", function(){
        const extract = extractClass("ref", "ima @table");
        assert.strictEqual(extract.column, "ima INTEGER");
        assert.strictEqual(extract.foreignKey, "FOREIGN KEY (ref) REFERENCES table (idx)");
    });    

    it("Reference in middle", function(){
        const extract = extractClass("ref", "ima @table");
        assert.strictEqual(extract.column, "ima INTEGER");
        assert.strictEqual(extract.foreignKey, "FOREIGN KEY (ref) REFERENCES table (idx)");
    });        

    it("No reference", function(){
        const extract = extractClass("ref", "INTEGER NOT NULL");
        assert.strictEqual(extract.column, "INTEGER NOT NULL");
        assert.strictEqual(extract.foreignKey, null);
    });     
});