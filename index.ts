import type { DollarSign } from "xpresser/types";
import EventsServerCommunicator from "./src/EventsServerCommunicator";
import EventsServer from "./src/EventsServer";

export function run(plugin: any, $: DollarSign) {
    const isEventsServer = $.engineData.get("isEventsServer", false) as boolean;

    if (!isEventsServer) {
        const KEY = $.config.get("eventsServer.key");
        $.eServer = new EventsServerCommunicator(KEY, $);
    }
}


export { EventsServer };
