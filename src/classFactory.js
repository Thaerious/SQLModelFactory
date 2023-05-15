import BaseClass from "./BaseClass.js";

/**
 * @param {ModelFactory} factory Factory that maintains shared classes.
 * @param {Object} model Description of the class to be generated.
 */
export default function classFactory(factory, model) {
    return class extends BaseClass{
        static factory = factory;
        static instantiated = new Map();
        static model = model;
        static name = model.$classname;
    }
}