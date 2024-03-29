import type { DollarSign } from "xpresser/types";
import EventsServerCommunicator from "./src/EventsServerCommunicator";
import { loadEventServerConfig } from "./src/functions";

/**
 * Xpresser plugin function.
 * @param plugin
 * @param $
 */
export function run(plugin: any, $: DollarSign) {
    if ($.isNativeCliCommand()) return;

    function startEventServerCommunicator(connect: boolean = true): Promise<void> {
        return new Promise((resolve, reject) => {
            const isEventsServer = $.engineData.get("isEventsServer", false) as boolean;

            if (!isEventsServer) {
                const [err, eventsServerConfig] = loadEventServerConfig($);
                if (err) return $.logErrorAndExit(`Config: ${err.message}`);

                // Get Secret key
                const { secretKey, controlPanel, communicatorName } = eventsServerConfig!;

                // remove secret key.
                $.config.unset("eventsServer.secretKey");

                // Initialize event server.
                $.eServer = new EventsServerCommunicator(secretKey, $, communicatorName);
                if (connect) $.eServer.connect(resolve, reject);
                else {
                    resolve();
                }

                // Set control panel.
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

    $.ifConsole(
        () => {
            // Set EventServerCommunicator starter function.
            $.startEServerCommunicator = startEventServerCommunicator;
        },
        () => {
            $.on.boot((next) => {
                // Start EventServer Communicator
                startEventServerCommunicator().catch(console.log);

                // Continue server boot
                next();
            });
        }
    );
}
