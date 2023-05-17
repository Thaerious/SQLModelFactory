export default function objectLogger(obj) {
    if (typeof obj !== "object") return obj;
    if (obj[Symbol.toStringTag]) return obj[Symbol.toStringTag];
    return doFormat(obj);
}

function doFormat(obj, builder = [], depth = 0, ref = [], isRef = [], symbol = ['{', '}']) {
    ref.push(obj);
    
    let keys = [];
    if (Array.isArray(obj)){
        keys = obj.keys();
    } else {
        keys = Object.getOwnPropertyNames(obj);
    }

    depth++;

    for (const key of keys) {
        const value = obj[key];        

        switch (typeof value) {
            case "string": {
                let s = `<cyan>${key}</>: <green>'${value}'</>`;
                s = s.padStart(3 * depth + s.length, " ");
                builder.push(s);
                break;
            }
            case "number": {
                let s = `<cyan>${key}</>: <yellow>${value}</>`;
                s = s.padStart(3 * depth + s.length, " ");
                builder.push(s);
                break;
            }
            case "object": {
                if (depth > 3) {
                    let s = `<cyan>${key}</>: <blue>[Object]</>`;
                    s = s.padStart(3 * depth + s.length, " ");
                    builder.push(s); 
                    break;
                }
                if (ref.indexOf(value) !== -1) {
                    let s = `<cyan>${key}</>: <blue>[Ref ${ref.indexOf(value)}]</>`;
                    s = s.padStart(3 * depth + s.length, " ");
                    builder.push(s); 
                    isRef.push(value)
                    break;                    
                }
                ref.push(value);
                
                if (Array.isArray(value)) {
                    let formattedValue = doFormat(value, [], depth, ref, isRef, ['[', ']']);
                    let s = `<cyan>${key}</>: ${formattedValue}`;
                    s = s.padStart(3 * depth + s.length, " ");
                    builder.push(s);                    
                } else {
                    let formattedValue = doFormat(value, [], depth, ref, isRef, ['{', '}']);
                    let s = `<cyan>${key}</>: ${formattedValue}`;
                    s = s.padStart(3 * depth + s.length, " ");
                    builder.push(s);
                }
                break;
            }
        }
    }

    depth--;
    builder.push(symbol[1].padStart((3 * depth) + 1, " "));

    const pre = obj?.constructor?.name !== "Object" && obj?.constructor?.name !== "Array"
        ? `<blue>[${obj?.constructor?.name} ${ref.indexOf(obj)}]</blue>${symbol[0]}\n`
        : `<blue><${ref.indexOf(obj)}></blue>${symbol[0]}\n`
        ;

    return pre + builder.join(",\n");
}