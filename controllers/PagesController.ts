import { Controller, Http } from "xpresser/types/http";
import { isServerAdmin } from "../middlewares/AccessMiddleware";
import EventsServerDb from "../src/EventsServerDb";
import { getInstance } from "xpresser";

const $ = getInstance();

/**
 * EventsController
 */
export = <Controller.Object>{
    // Controller Name
    name: "PagesController",

    // Controller Default Error Handler.
    e: (http: Http, error: string) => http.status(401).json({ error }),

    middleware({ use }: any) {
        return {
            "@*": use(isServerAdmin)
        };
    },

    boot(http: Http) {
        http.state.set("title", "");
    },

    /**
     * Example Action.
     * @param http - Current Http Instance
     */
    dashboard(http) {
        // $.eServer.emit("hello");
        const eventsServerDB = new EventsServerDb($);

        const events = eventsServerDB.failedEvents();
        const failedEvents = [];

        for (const [id, event] of Object.entries(events.all())) {
            failedEvents.push({
                id: id,
                ...(event as any)
            });
        }

        // http.req.cookies.token = "hello";
        return http.view(
            "events-server::layout",
            { view: "dashboard", title: "Dashboard", failedEvents },
            false,
            true
        );
    },

    retryFailedEvents(http) {
        $.eServer.retryFailedEvents();
        return http.redirectBack();
    }
};
