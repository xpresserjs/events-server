import {Http} from "xpresser/types/http";
import {accessDb, saveAccessDb} from "../src/AccessDb";
import moment from "moment";

/**
 * Access Middleware
 * Restricts access to certain routes.
 * @param http
 */
export const isServerAdmin = (http: Http) => {
    const at = http.req.cookies.at;

    const key = at ? `logins.${at}` : "none";

    if (!at || !accessDb.has(key)) {
        return http.redirectToRoute("events-server", [], {
            error: "UnAuthorized Access!"
        });
    }

    const token = accessDb.get(key);

    // check if token has expired.
    if (moment(token).isBefore()) {
        accessDb.unset(token);
        saveAccessDb();

        return http.redirectToRoute("events-server", [], {
            error: "Session expired, Re-login required."
        });
    }

    // Add 30 minutes to session
    accessDb.set(key, moment().add(30, "minutes").toDate());
    saveAccessDb();

    return http.next();
};
