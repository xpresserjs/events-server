import { Controller, Http } from "xpresser/types/http";
import { getInstance } from "xpresser";

const $ = getInstance();

/**
 * AccessController
 */
export = <Controller.Object>{
    // Controller Name
    name: "AccessController",

    // Controller Default Error Handler.
    e: (http: Http, error: string) => http.status(401).json({ error }),

    /**
     * Example Action.
     * @param http - Current Http Instance
     */
    login(http) {
        // console.log($.engineData);
        return http.view("events-server::login", {}, false, true);
        // return { failed: true };
    }
};
