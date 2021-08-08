import { init } from "xpresser";

const $ = init({
    name: "Events Server Test",
    env: "development",

    paths: {
        base: __dirname
    },

    eventsServer: {
        secretKey: "SECRET_KEY",
        port: 7001,
        logs: { args: true }
    }
});

$.initializeTypescript(__filename);

export { $ };
