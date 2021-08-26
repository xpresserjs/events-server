import ObjectCollection from "object-collection";
import type { DollarSign } from "xpresser/types";
import { EventDetails } from "./Types";

export type PendingEvent = {
    event: string;
    args: any[];
    added: Date;
};

export type FailedEvent = {
    event: string;
    args: any[];
    added: Date;
    retries: Array<{ date: Date; error: { message: string; stack: string } }>;
};

class EventsServerDb {
    data!: ObjectCollection;
    private readonly $!: DollarSign;
    private saveTimeout!: NodeJS.Timeout;

    constructor($: DollarSign, isCommunicator = false) {
        Object.defineProperty(this, "$", {
            value: $,
            enumerable: false
        });

        this.data = new ObjectCollection({});
        this.setupDb(isCommunicator);
    }

    serverDbPath() {
        return this.$.config.get("eventsServer.dbPaths.server");
    }

    communicatorDbPath() {
        return this.$.config.get("eventsServer.dbPaths.communicator");
    }

    private setupDb(isCommunicator = false) {
        const $ = this.$;
        const serverDB = $.config.sync("eventsServer.dbPaths.server");
        const communicatorDB = $.config.sync("eventsServer.dbPaths.communicator");

        if (!$.engineData.has("eventsServerDbHasSetupPaths")) {
            serverDB.changeTo($.path.resolve(serverDB.sync));
            communicatorDB.changeTo($.path.resolve(communicatorDB.sync));

            $.file.makeDirIfNotExist(serverDB.sync, true);
            $.file.makeDirIfNotExist(communicatorDB.sync, true);

            $.engineData.set("eventsServerDbHasSetupPaths", true);
        }

        if (isCommunicator && $.file.exists(communicatorDB.sync)) {
            this.data.replaceData($.file.readJson(communicatorDB.sync));
        }

        if (!isCommunicator && $.file.exists(serverDB.sync)) {
            this.data.replaceData($.file.readJson(serverDB.sync));
        }

        this.data.path(isCommunicator ? "pending" : "failed");
    }

    recordPendingEvent(eventDetails: EventDetails, instantly = false) {
        const event = this.data.path("pending");

        event.set(eventDetails.eventId, {
            event: eventDetails.event,
            args: eventDetails.args,
            added: new Date()
        });

        return this.save(true, instantly);
    }

    recordFailedEvent(eventDetails: EventDetails, e: Error) {
        const event = this.data.path("failed");

        if (event.has(eventDetails.eventId)) {
            event.path(eventDetails.eventId).compute((event) => {
                // Increase Retries
                event.array("retries", true).push({
                    date: new Date(),
                    error: { message: e.message, stack: e.stack }
                });

                return event;
            });
        } else {
            event.set(eventDetails.eventId, {
                event: eventDetails.event,
                args: eventDetails.args,
                added: new Date(),
                error: { message: e.message, stack: e.stack },
                retries: []
            });
        }

        return this.save();
    }

    markAsSuccessful(id: string) {
        this.failedEvents().unset(id);
        return this.save();
    }

    failedEvents() {
        return this.data.path("failed");
    }

    pendingEvents() {
        return this.data.path("pending");
    }

    save(isCommunicator = false, instantly = false) {
        clearTimeout(this.saveTimeout);
        const $ = this.$;

        const isDev = $.config.get("env") === "development";
        const pathToFile = isCommunicator ? this.communicatorDbPath() : this.serverDbPath();

        const save = () => {
            $.file.saveToJson(pathToFile, this.data.all(), {
                checkIfFileExists: false,
                space: isDev ? 2 : 0
            });
        };

        if (instantly) {
            save();
            return this;
        }

        this.saveTimeout = setTimeout(save, isDev ? 1000 : 2000);

        return this;
    }
}

export default EventsServerDb;
