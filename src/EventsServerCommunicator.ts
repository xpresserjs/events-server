import type { DollarSign } from "xpresser/types";
import { connect, Socket } from "net";
import { md5, now } from "./functions";
import EventsServerDb from "./EventsServerDb";
import { nanoid } from "nanoid";
import PlaneSocket from "./PlaneSocket";

class EventsServerCommunicator {
    readonly #secretKey!: string;
    readonly name?: string;
    readonly $: DollarSign;
    private socket!: Socket;
    public isConnected = false;
    private readonly db: EventsServerDb;

    constructor(secretKey: string, $: DollarSign, name?: string) {
        if (!secretKey) $.logErrorAndExit("secretKey is required");
        // Set Secret Key
        this.#secretKey = md5(secretKey);
        // Set Db
        this.db = new EventsServerDb($, true);

        // set name if provided
        if (name) this.name = name;

        // Set xpr instance.
        this.$ = $;
    }

    connect(onAuthorized?: (...args: any) => any, onError?: (err: any) => any) {
        const $ = this.$;
        const port = $.config.get("eventsServer.port");
        const server = $.config.get("eventsServer.server");
        const keepAlive = $.config.get("eventsServer.keepAlive");

        const ps = new PlaneSocket(() => {
            const socket = connect({ port, host: server });

            socket.on("connect", () => {
                ps.emit("Authorize", { secretKey: this.#secretKey, name: this.name });
            });

            socket.on("error", (err) => {
                this.isConnected = false;
                if (onError) onError(err);

                if (!$.options.isConsole) {
                    $.logError(`Failed to connect to EventsServer @ port: ${port}`);
                }
            });

            socket.on("end", () => {
                this.isConnected = false;
                $.logWarning(`Disconnected from Events Server @ ${now()}`);
                // socket.offAny();
            });

            return socket;
        });

        if (keepAlive) {
            ps.$keepAlive();
        }

        ps.on(`Authorized:${this.#secretKey}`, () => {
            this.isConnected = true;
            if (onAuthorized) onAuthorized();

            if (!$.options.isConsole) {
                $.logInfo(`Connected to Events Server @ (${port})`);
            }
        });

        ps.on(`RemoveFromPending:${this.#secretKey}`, (id) => {
            const pendingEvents = this.db.pendingEvents();

            if (!pendingEvents.has(id)) return this;

            this.db.pendingEvents().unset(id);

            return this.db.save(true);
        });

        Object.defineProperty(this, "socket", {
            value: ps,
            enumerable: false,
            writable: false
        });

        ps.$setupListeners();
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

    push(event: string, ...args: any[]) {
        this.db.recordPendingEvent(
            {
                event,
                eventId: nanoid(10),
                args
            },
            true
        );

        return this;
    }

    retryFailedEvents() {
        if (this.isConnected) {
            this.emit("$retryFailedEvents");
        }
    }

    failedEvents() {
        return this.db.failedEvents();
    }
}

export = EventsServerCommunicator;
