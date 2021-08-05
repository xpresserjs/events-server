import { Controller, Http } from "xpresser/types/http";

/**
 * EventsController
 */
export = <Controller.Object>{
    // Controller Name
    name: "EventsController",

    // Controller Default Error Handler.
    e: (http: Http, error: string) => http.status(401).json({ error }),

    /**
     * Example Action.
     * @param http - Current Http Instance
     */
    login(http) {
        return http.send({
            route: http.route
        });
    }
};
