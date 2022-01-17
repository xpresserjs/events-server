import JobHelper from "xpresser/src/Console/JobHelper";
import EventsServerDb from "../src/EventsServerDb";

export = async (args: string[], { helper }: { helper: JobHelper }) => {
    const $ = helper.$;
    const [command, id] = args;

    await $.startEServerCommunicator(false);

    const eventsServerDB = new EventsServerDb($);
    const events = eventsServerDB.failedEvents();

    if (command) {
        if (command === "list") {
            return $.logAndExit(events.data);
        } else if (command === "events") {
            // Get unique array of events
            const uniqueEvents: string[] = [];

            for (const event of events.values()) {
                if (!uniqueEvents.includes(event.event)) {
                    uniqueEvents.push(event.event);
                }
            }

            return $.logAndExit(uniqueEvents);
        } else if (command === "delete") {
            if (!id) {
                return $.logErrorAndExit("Please provide an event id to delete");
            }

            if (!events.has(id)) {
                return $.logErrorAndExit(`Failed event with id: "${id}" not found`);
            }

            events.unset(id);
            eventsServerDB.save(false, true);

            $.logSuccess(`Event "${id}" has been removed from failed events`);

            return $.exit();
        } else if (command === "flush") {
            const oldLen = events.length();
            eventsServerDB.data.set("failed", {});

            eventsServerDB.save(false, true);

            $.logSuccess(`${oldLen} events cleared`);
            return $.exit();
        } else {
            return $.logErrorAndExit(`Command "${command}" not found`);
        }
    }

    $.logAndExit(`You have ${events.length()} failed events.`);
};
