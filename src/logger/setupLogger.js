import Logger, { colorize, position } from "@thaerious/logger";
import ParseArgs from "@thaerious/parseargs";
import sqlLogger from "./sqlLogger.js";
import objectLogger from "./objectLogger.js";

/**
 * date : Date object
 * dateArray : Date array, specifies formatting
 * seperator : Seperator
 */
function joinDate(date, dateArray, seperator) {
    function format(m) {
        let f = new Intl.DateTimeFormat('en', m);
        return f.format(date);
    }
    return dateArray.map(format).join(seperator);
}

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

function trace(value) {
    const stack = new Error().stack.split("\n");
    let out = [];

    let line = stack.shift();
    while (stack.length > 0) {
        if (line.indexOf("/Logger.js:") !== -1) break;
        line = stack.shift();
    }

    line = stack.shift();
    let last = ["", ""]
    while (stack.length > 0) {
        const i = line.indexOf("file:///");       
        
        if (i === -1) {
            line = stack.shift();
            continue;
        }

        line = line.substring(i + 8);
        const parsed = /([^/:]+):(\d+)/.exec(line);

        if (!parsed) {
            line = stack.shift();
            continue;
        }

        const split = parsed[0].split(":");

        if (split[0] !== last[0]) {
            out.unshift(`${split[0]}:${split[1]}`);
            last = split;
        }
        else {
            out[out.length - 1] = (`${out[out.length - 1]}-${split[1]}`);
        }

        line = stack.shift();
    }

    out = out.map(e => `[${e}]`);
    return  `${out.join("")}\n${value}`;
}

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
    position,
    colorize,
    console
];

logger.sql.handlers = [
    sqlLogger,
    trace,
    colorize,
    console
]

export default logger;