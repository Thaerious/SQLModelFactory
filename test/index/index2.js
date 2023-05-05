import { mkdirif } from "@thaerious/utility";
import ModelFactory from "../../src/ModelFactory.js";
import logger from "../../src/setupLogger.js";
import assert from "assert";

const DBPATH = mkdirif("test", "assets", "test.db");
const factory = new ModelFactory(DBPATH, { verbose: logger.sql });

const { Owner, GameModel } = factory.createClasses({
    "Owner": {
        "name": "VARCHAR(64) NOT NULL",
        "email": "VARCHAR(64) NOT NULL"
    },
    "Cell": {
        "value": "INTEGER",
        "question": "VARCHAR(256)",
        "answer": "VARCHAR(256)",
    },
    "Row": {
        "cells": ["@Cell"],
    },
    "Col": {
        "category": "VARCHAR(64) NOT NULL",
        "rows": ["@Row"],
    },
    "Round": {
        "cols": ["@Col"]
    },
    "GameModel": {
        "modelname": "VARCHAR(32) NOT NULL",
        "owner": "@Owner",
        "rounds": ["@Round"]
    }
});

factory.createTables();

const row = new factory.classes.Row();

const col = new factory.classes.Col({
    category: "stuff",
    rows: [
        row
    ]
});


row.cells.push({ value:  100, question: "what", answer: "that"});

col.rows.push(row);