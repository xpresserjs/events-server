import type { DollarSign } from "xpresser/types";
import EventsServerCommunicator from "./src/EventsServerCommunicator";
import EventsServer from "./src/EventsServer";
import { loadEventServerConfig } from "./src/functions";

export function run(plugin: any, $: DollarSign) {
    function startEventServerCommunicator(connect = true) {
        return new Promise((resolve, reject) => {
            const isEventsServer = $.engineData.get("isEventsServer", false) as boolean;
            if (!isEventsServer) {
                const [err, eventsServerConfig] = loadEventServerConfig($);
                if (err) return $.logErrorAndExit(`Config: ${err.message}`);

                // Get Secret key
                const { secretKey, controlPanel } = eventsServerConfig!;

                // remove secret key.
                $.config.unset("eventsServer.secretKey");

                // Initialize event server.
                $.eServer = new EventsServerCommunicator(secretKey, $);

                if (connect) $.eServer.connect(resolve, reject);

                if (!$.options.isConsole && controlPanel.enabled) {
                    $.on.expressInit((next) => {
                        // Start Cookie parser
                        const cookieParser = require("cookie-parser");

                        // Use cookie parser on routePath
                        $.app!.use(controlPanel.routePath, cookieParser());

                        return next();
                    });
                }
            }
        });
    }

    $.ifConsole(() => {
        // Set EventServerCommunicator starter function.
        $.startEServerCommunicator = startEventServerCommunicator;
    }, startEventServerCommunicator);
}

export { EventsServer };
