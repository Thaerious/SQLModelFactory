import assert from "assert";
import {extractReference} from "../src/extractReference.js";

describe("Extract Reference Test : extractReference.js", function () {
    it("Reference only", function(){
        const extract = extractReference("ref", "@table");
        assert.strictEqual(extract.column, "INTEGER");
        assert.strictEqual(extract.foreignKey, "FOREIGN KEY (ref) REFERENCES table (idx)");
    });

    it("Reference at beinning", function(){
        const extract = extractReference("ref", "@table NOT NULL");
        assert.strictEqual(extract.column, "INTEGER NOT NULL");
        assert.strictEqual(extract.foreignKey, "FOREIGN KEY (ref) REFERENCES table (idx)");
    });   

    it("Reference at end", function(){
        const extract = extractReference("ref", "ima @table");
        assert.strictEqual(extract.column, "ima INTEGER");
        assert.strictEqual(extract.foreignKey, "FOREIGN KEY (ref) REFERENCES table (idx)");
    });    

    it("Reference in middle", function(){
        const extract = extractReference("ref", "ima @table");
        assert.strictEqual(extract.column, "ima INTEGER");
        assert.strictEqual(extract.foreignKey, "FOREIGN KEY (ref) REFERENCES table (idx)");
    });        

    it("No reference", function(){
        const extract = extractReference("ref", "INTEGER NOT NULL");
        assert.strictEqual(extract.column, "INTEGER NOT NULL");
        assert.strictEqual(extract.foreignKey, null);
    });     
});