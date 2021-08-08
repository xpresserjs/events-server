import XpresserRouter from "@xpresser/router";

const namespace = "events-server";

const route = new XpresserRouter(namespace);

route
    .path("/__event_server__", () => {
        route.get("=login");
    })
    .controller("Access", true)
    .as(namespace);

export = route;
