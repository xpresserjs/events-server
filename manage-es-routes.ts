import XpresserRouter from "@xpresser/router";
import { getInstance } from "xpresser";
import { EventsServerConfig } from "./src/Types";

const $ = getInstance();
const namespace = "events-server";
const route = new XpresserRouter(namespace);

// Plugin Config
const { controlPanel }: EventsServerConfig = $.config.get("eventsServer");

// Enable routes if plugin config has controlPanel enabled.
if (controlPanel.enabled) {
    route
        .path(controlPanel.routePath, () => {
            route.get("=login");
            route.post("=login");

            route.useController("Pages", () => {
                route.get("@dashboard");
                route.post("@retryFailedEvents");
            });
        })
        .controller("Access", true)
        .as(namespace);
}

export = route;
