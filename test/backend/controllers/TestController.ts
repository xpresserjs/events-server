import { Controller, Http } from "xpresser/types/http";
import { $ } from "../../xpresser";

/**
 * TestController
 */
export = <Controller.Object>{
    // Controller Name
    name: "TestController",

    // Controller Default Error Handler.
    e: (http: Http, error: string) => http.status(401).json({ error }),

    // middlewares: {
    //     jss: "index"
    // },

    /**
     * Example Action.
     * @param http - Current Http Instance
     */
    index(http) {
        $.eServer.emit("hello", 10000);
        $.eServer.emit("hello", 20000);
        $.eServer.emit("hello", 30000);
        $.eServer.emit("hello", 40000);
        $.eServer.emit("hello", 50000);
        $.eServer.emit("hello", 60000);
        return http.send({
            route: http.route
        });
    }
};
