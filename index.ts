import type { DollarSign } from "xpresser/types";
import EventsServerCommunicator from "./src/EventsServerCommunicator";
import EventsServer from "./src/EventsServer";
import { loadEventServerConfig } from "./src/functions";

export function run(plugin: any, $: DollarSign) {
    function startEventServerCommunicator() {
        const isEventsServer = $.engineData.get("isEventsServer", false) as boolean;

        if (!isEventsServer) {
            const [err, eventsServerConfig] = loadEventServerConfig($);
            if (err) return $.logErrorAndExit(`Config: ${err.message}`);

            // Get Secret key
            const { secretKey } = eventsServerConfig!;
            // Set config to merged config.
            $.config
                .set("eventsServer", eventsServerConfig)
                // remove secret key.
                .unset("eventsServer.secretKey");

            // Initialize event server.
            $.eServer = new EventsServerCommunicator(secretKey, $);
        }
    }

    $.ifConsole(() => {
        // Set EventServerCommunicator starter function.
        $.startEventServerCommunicator = startEventServerCommunicator;
    }, startEventServerCommunicator);
}

export { EventsServer };
