import Logger, { colorize, position } from "@thaerious/logger";
import ParseArgs from "@thaerious/parseargs"

const options = {
    flags: [
        {
            long: `verbose`,
            short: `v`,
            type: `boolean`
        }
    ]
};

const args = new ParseArgs().config(options).run();
const logger = new Logger();

logger.verbose.enabled = args.flags["verbose"];
logger.veryverbose.enabled = args.tally["verbose"] >= 2;

logger.verbose.handlers = [
    position,
    colorize,
    console
];

logger.veryverbose.handlers = [
    position,
    colorize,
    console
]

export default logger;