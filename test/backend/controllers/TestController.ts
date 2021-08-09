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
        $.eServer.emit("hello", 1);
        return http.send({
            route: http.route
        });
    }
};
