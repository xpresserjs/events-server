import type { DollarSign } from "xpresser/types";
import io from "socket.io-client";
import { Socket } from "socket.io";
import { now, md5 } from "./functions";
import EventsServerDb from "./EventsServerDb";
import { nanoid } from "nanoid";

class EventsServerCommunicator {
    readonly #secretKey!: string;
    private socket!: Socket;
    private isConnected = false;
    private readonly db: EventsServerDb;

    constructor(secretKey: string, $: DollarSign) {
        if (!secretKey) $.logErrorAndExit("secretKey is required");
        // Set Secret Key
        this.#secretKey = md5(secretKey);
        // Set Db
        this.db = new EventsServerDb($, true);

        const port = $.config.get("eventsServer.port");
        const server = $.config.get("eventsServer.server");
        // Initialise socket connection
        const socket = io(`${server}:${port}`);

        socket.on("error", (err) => {
            this.isConnected = false;
            if (err) $.logError(err);
            else $.logError(`Failed to connect to EventsServer @ port: ${port}`);
        });

        socket.on("disconnect", () => {
            this.isConnected = false;
            $.logWarning(`Disconnected from Events Server @ ${now()}`);
            socket.offAny();
        });

        socket.on("connect", () => {
            socket.emit("Authorize", { secretKey: this.#secretKey });
        });

        socket.on(`Authorized:${this.#secretKey}`, () => {
            this.isConnected = true;
            $.logInfo(`Connected to Events Server (${port}) with Id: ${socket.id}`);

            if ($.events) {
                socket.onAny((event, ...args) => {
                    $.events.emit(event, ...args);
                });
            }
        });

        socket.on(`RemoveFromPending:${this.#secretKey}`, (id) => {
            const pendingEvents = this.db.pendingEvents();

            if (!pendingEvents.has(id)) return this;

            this.db.pendingEvents().unset(id);

            return this.db.save(true);
        });

        Object.defineProperty(this, "socket", {
            value: socket,
            enumerable: false,
            writable: false
        });
    }

    emit(event: string, ...args: any[]) {
        if (this.isConnected) {
            return this.socket.emit(event, ...args);
        } else {
            this.db.recordPendingEvent({
                event,
                eventId: nanoid(10),
                args
            });
        }
    }

    retryFailedEvents() {
        this.emit("$retryFailedEvents");
    }
}

export = EventsServerCommunicator;
