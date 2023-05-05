import Logger, { colorize, position} from "@thaerious/logger";
import FS from "fs";
import ParseArgs from "@thaerious/parseargs";
import sqlLogger from "./sqlLogger.js";
import objectLogger from "./objectLogger.js";

const options = {
    flags: [
        {
            long: `verbose`,
            short: `v`,
            type: `count`
        }
    ]
};

const args = new ParseArgs(options);
const logger = new Logger();

logger.standard.enabled = true;
logger.error.enabled = true;
logger.log.enabled = true;
logger.verbose.enabled = false;
logger.veryverbose.enabled = false;

if (args.verbose >= 1) logger.verbose.enabled = true;
if (args.verbose >= 2) logger.veryverbose.enabled = true;

logger.error.handlers = [
    (error) => {
        if (error instanceof Error) {
            return `<red>ERROR ${error.message}</red>`;
        } else {
            return `<red>ERROR ${error}</red>`;
        }
    },
    position,    
    colorize,
    console
];

logger.log.handlers = [
    objectLogger,
    position,
    colorize,
    console
];

logger.verbose.handlers = [
    objectLogger,
    position,
    colorize,
    console
];

logger.veryverbose.handlers = [
    objectLogger,
    position,
    colorize,
    console
];

logger.sql.handlers = [
    sqlLogger,
    colorize,
    console
]

export default logger;