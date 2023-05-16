const object1 = {
    [Symbol.toPrimitive](hint) {
        console.log(hint);
        return "x.42.x";
    }
};

console.log(+object1 + "");
  // Expected output: 42
