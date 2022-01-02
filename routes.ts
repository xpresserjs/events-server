import XpresserRouter from "@xpresser/router";
import { getInstance } from "xpresser";
import { EventsServerConfig } from "./src/Types";
import { loadEventServerConfig } from "./src/functions";

const $ = getInstance();
const namespace = "events-server";
const route = new XpresserRouter(namespace);

loadEventServerConfig($);

// Plugin Config
const { controlPanel }: EventsServerConfig = $.config.get("eventsServer");

// Enable routes if plugin config has controlPanel enabled.
if (controlPanel.enabled) {
    route
        .path(controlPanel.routePath, () => {
            route.get("=login");
            route.post("=login");
            route.post("@logout");

            route.useController("Pages", () => {
                route.get("@dashboard");
                route.post("@retryFailedEvents");
            });
        })
        .controller("Access", true)
        .as(namespace);
}

export = route;
