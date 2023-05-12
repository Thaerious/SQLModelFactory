
class ReflectedBaseClass {
    constructor(...args) {
        // let deferred = [];
        // if (!args[0] || Object.keys(args[0]).length === 0) {
        //     // no-arg or args[0] == {}
        //     this._constructDefault();
        // } else {
        //     deferred = this._constructFromData(args[0]);
        // }

        // const proxy = this.constructor._doProxy(this, this.idx);
        // processDeferred(this.constructor.factory, deferred, proxy);
        return new Proxy(this, this);
    }

    getOwnPropertyDescriptor(target, prop) {
        
    }
}



export default ReflectedBaseClass;