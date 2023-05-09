import ModelFactory from "../../src/ModelFactory.js";
import { mkdirif } from "@thaerious/utility";
import ParseArgs from "@thaerious/parseargs";
import fs from "fs";

const args = new ParseArgs().run();

export default function setupTests(models, label, ...tests) {
    return describe(label, function () {
        const DBPATH = mkdirif("test", "assets", "test.db");

        before(function () {
            if (fs.existsSync(DBPATH)) {
                console.log(`  Before: Removing database '${DBPATH}'`);
                fs.rmSync(DBPATH, { recursive: true });
            }
        });

        before(function () {
            this.factory = new ModelFactory(DBPATH, { /* verbose: console.log */ });
            this.classes = this.factory.createClasses(models);
            this.factory.createTables();
        });

        after(function () {
            this.factory.close();
        });

        after(function () {
            if (!args.flags["no-clean"]) {
                if (fs.existsSync(DBPATH)) {
                    console.log(`After: Removing database '${DBPATH}'`);
                    fs.rmSync(DBPATH, { recursive: true });
                }
            }
        });

        for (const test of tests) test();
    });
};