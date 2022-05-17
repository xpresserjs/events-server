import { $ } from "./xpresser";

$.on.boot((next) => {
    const route = $.router;

    route.get("/", "Test@index");

    return next();
});

$.boot();
