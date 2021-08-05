import { init } from "xpresser";

const $ = init({
    name: "Events Server Test",
    env: "development",

    paths: {
        base: __dirname
    },

    eventsServer: {
        secretKey: "SECRET_KEY",
        logs: { args: true, shs: "h" }
    }
});

$.initializeTypescript(__filename);

export { $ };
