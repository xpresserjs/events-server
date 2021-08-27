import type { DollarSign } from "xpresser/types";
import { Socket, connect } from "net";
import { now, md5 } from "./functions";
import EventsServerDb from "./EventsServerDb";
import { nanoid } from "nanoid";
import PlaneSocket from "./PlaneSocket";

class EventsServerCommunicator {
    readonly #secretKey!: string;
    readonly $: DollarSign;
    private socket!: Socket;
    private isConnected = false;
    private readonly db: EventsServerDb;

    constructor(secretKey: string, $: DollarSign) {
        if (!secretKey) $.logErrorAndExit("secretKey is required");
        // Set Secret Key
        this.#secretKey = md5(secretKey);
        // Set Db
        this.db = new EventsServerDb($, true);

        // Set xpr instance.
        this.$ = $;
    }

    connect() {
        const $ = this.$;
        const port = $.config.get("eventsServer.port");
        const server = $.config.get("eventsServer.server");

        const ps = new PlaneSocket(() => {
            const socket = connect({ port, host: server });

            socket.on("connect", () => {
                ps.emit("Authorize", { secretKey: this.#secretKey });
            });

            socket.on("error", (err) => {
                this.isConnected = false;
                $.logError(`Failed to connect to EventsServer @ port: ${port}`);
            });

            socket.on("end", () => {
                this.isConnected = false;
                $.logWarning(`Disconnected from Events Server @ ${now()}`);
                // socket.offAny();
            });

            return socket;
        }).$keepAlive();

        ps.on(`Authorized:${this.#secretKey}`, () => {
            this.isConnected = true;
            $.logInfo(`Connected to Events Server (${port}) with Id: {{SUPPOSED_ID}}`);
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
        this.emit("$retryFailedEvents");
    }
}

export = EventsServerCommunicator;
