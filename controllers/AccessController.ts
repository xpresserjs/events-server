import { Controller, Http } from "xpresser/types/http";
import { nanoid } from "nanoid";
import { getInstance } from "xpresser";
import { accessDb, saveAccessDb } from "../src/AccessDb";
import moment from "moment";

const $ = getInstance();
const eServerAdminPass: string = $.config.get("eventsServer.controlPanel.password");

/**
 * AccessController
 */
export = <Controller.Object>{
    // Controller Name
    name: "AccessController",

    // Controller Default Error Handler.
    e: (http: Http, error: string) => http.status(401).json({ error }),

    boot(http: Http) {
        http.state.set("title", "");
    },
    /**
     * Example Action.
     * @param http - Current Http Instance
     */
    login(http) {
        if (http.route.method === "get") {
            return http.view("events-server::layout", { view: "login" }, false, true);
        }

        const password = http.body("eServerPassword");

        if (!password || (password && password != eServerAdminPass)) {
            return http.redirectToRoute("events-server", [], {
                error: `Incorrect password. Please try again!`
            });
        }

        const token = nanoid(),
            expiresAt = moment().add(30, "minutes").toDate();

        accessDb.set(`logins.${token}`, expiresAt);
        saveAccessDb();

        // Set Auth Token
        http.res.cookie("at", token);

        return http.redirectToRoute("events-server.dashboard");
    },

    logout(http) {
        const token = http.req.cookies["at"];

        accessDb.unset(`logins.${token}`);
        saveAccessDb();

        return http.redirectToRoute("events-server");
    }
};
