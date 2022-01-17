import { $ } from "./xpresser";

$.on.boot((next) => {
    const route = $.router;

    route.get("/", "Test@index");

    return next();
});

// $.on.serverBooted((n) => {
//     setTimeout(() => {
//         $.eServer.emit("fail", { test: "test" });
//         $.logInfo("Emitted!");
//     }, 1000);
//
//     return n();
// });

// Boot Xpresser
$.boot();
