import ReflectedBaseClass from "../../src/ReflectedBaseClass.js";

function factory(value) {
    return class extends ReflectedBaseClass {
        static value = value;
    }
}

const myClass = factory("apple");
console.log(myClass.value);