import type { DollarSign } from "xpresser/types";
import XpresserRouter from "@xpresser/router";
import { Server, Socket } from "socket.io";
import { loadEventServerConfig, md5, now } from "./functions";
import {
    EventHandlerFn,
    EventRoute,
    EventsArray,
    EventsControllerContext,
    SocketOrIdAndSocket
} from "./Types";
import EventsServerDb, { FailedEvent, PendingEvent } from "./EventsServerDb";
import { nanoid } from "nanoid";

class EventsServer {
    readonly #secretKey!: string;
    private server!: Server;
    port!: number;
    private readonly db!: EventsServerDb;
    private readonly $: DollarSign;
    private readonly $router!: XpresserRouter;
    private readonly isCliCommand: boolean;
    private retryTimeout!: NodeJS.Timeout;

    /**
     * Take xpresser instance and port.
     * Create our server.
     * @param secretKey
     * @param $
     * @param port
     */
    constructor(secretKey: string, $: DollarSign) {
        if ($.engineData.has("hasBooted"))
            $.logErrorAndExit(`$.boot() was called before reaching events server.`);

        if (!$.config.has("eventsServer"))
            $.logErrorAndExit(`{eventsServer} is not defined in config.`);

        const [err, eventsServerConfig] = loadEventServerConfig($, true);
        if (err) $.logErrorAndExit(`Config: ${err.message}`);

        $.config
            .set("eventsServer", eventsServerConfig)
            // remove secret key.
            .unset("eventsServer.secretKey");

        // Set SecretKey
        this.#secretKey = md5(secretKey);

        // Set Port
        this.port = $.config.get("eventsServer.port");

        // Disable expose $
        $.options.exposeDollarSign = false;
        // Set isConsole = true;
        $.options.isConsole = true;

        // change jsonsFolder
        $.engineData.set("isEventsServer", true);
        // Change JsonConfigs path
        $.config.set("paths.backend", "base://events-server");

        // xpresser instance
        this.$ = $;

        // New Router Instance.
        this.$router = new XpresserRouter();

        // Check launch type
        this.isCliCommand = $.engineData.get("LaunchType") === "cli";

        // if launch type is cli, change controller stub path.
        if (this.isCliCommand) {
            $.config.set("artisan.factory.controller", __dirname + "/controller.hbs");
        } else {
            // Set To requireOnly
            $.options.requireOnly = true;

            // Set Db
            this.db = new EventsServerDb($);

            // Initialize Server on Start
            $.on.start((next) => this.initializeSocket() && next());
        }
    }

    /**
     * Map event to function or controller
     * @param event
     * @param fn
     */
    on(event: string, fn?: string | EventHandlerFn) {
        this.$router.any(event, fn);

        return this;
    }

    /**
     * Get all loaded events
     */
    private getAllEvents() {
        return this.$.engineData.get("EventsServerEvents") as EventsArray;
    }

    /**
     * Start Listening for events
     */
    startListening() {
        if (!this.isCliCommand) {
            // Process Routes on boot.
            this.$.on.boot((next) => this.processRoutes() && next());

            /**
             * Start listening for events
             */
            this.$.on.boot((next) => {
                this.addConnectionListener().server.listen(this.port);

                return next();
            });
        }

        this.$.boot();
    }

    /**
     * Initialize Socket
     * @private
     */
    private initializeSocket() {
        this.server = new Server();

        this.server.on("error", () => {
            this.$.logErrorAndExit("Events Server failed to start!");
        });

        return this;
    }

    private processRoutes() {
        // Abbreviate $;
        const $ = this.$;

        // Log current backend Folder.
        $.log(`Backend Folder: ${$.config.get("paths.backend")}`);

        // Load Xpresser Routes Loader.
        require("xpresser/dist/src/Routes/Loader");

        // Process all defined routes
        $.routerEngine.processRoutes(this.$router.routes);

        // Get all processed routes
        const routes = $.routerEngine.allProcessedRoutes() as EventRoute[];

        // Load Xpresser's own controller getter.
        const ControllerGetter = require("xpresser/dist/src/ControllerEngine") as (
            ...args: any
        ) => {
            middlewares: any[];
            $controller: any;
            method: string;
        };

        const events = [] as EventsArray;
        /**
         * Loop through routes, get commands and bind then to the appropriate functions.
         */
        for (const route of routes) {
            if (typeof route.controller === "string") {
                const { $controller, method } = ControllerGetter(route, null, true);

                if (!$controller.hasOwnProperty(method)) {
                    const nameOfController = route.controller.split("@")[0] || "UNNAMED_CONTROLLER";

                    $.logErrorAndExit(
                        `Method '${method}' does not exist in {${
                            $controller.name || nameOfController
                        }}`
                    );

                    break;
                }

                events.push({
                    event: route.url,
                    handler: this.wrapControllerFunction($controller, route.url, method),
                    controller: route.controller
                });
            } else {
                events.push({
                    event: route.url,
                    handler: this.wrapControllerFunction(route.controller, route.url),
                    controller: route.controller
                });
            }
        }

        $.engineData.set("EventsServerEvents", events);

        return this;
    }

    private addConnectionListener() {
        this.server.on("connection", (socket) => {
            socket.on("Authorize", (data) => {
                if (data.secretKey && data.secretKey === this.#secretKey) {
                    this.$.logSuccess(`Established a secured connection with Id: ${socket.id}`);
                    this.$.logCalmly(">>>>>>>>>>>>>>>>>>> LISTENING <<<<<<<<<<<<<<<<<<<<");

                    return this.listenToAllRoutes(socket);
                }

                return socket.emit("error", "Authorization Failed, Invalid SECRET_KEY!");
            });
        });

        return this;
    }

    private listenToAllRoutes(socket: Socket) {
        const events = this.getAllEvents();

        for (const event of events) {
            socket.on(event.event, (...args) => event.handler(socket, ...args));
        }

        socket.emit(`Authorized:${this.#secretKey}`);

        this.retryFailedEvents(socket);
        this.runPendingEvents(socket);
    }

    private triggerRetryFailedEvents(socket: Socket, secs: number = 10) {
        // Clear all old retry events
        clearTimeout(this.retryTimeout);

        this.retryTimeout = setTimeout(() => {
            this.retryFailedEvents(socket);
        }, secs * 1000);
    }

    /**
     * Wrap a function around Events Server Before and After events.
     * @param $controller
     * @param event
     * @param method
     * @private
     */
    private wrapControllerFunction($controller: any, event: string, method?: string) {
        const $ = this.$;
        const logArgs = $.config.get("eventsServer.log.args", false);

        const WrappedHandler = async (socket: SocketOrIdAndSocket, ...args: any[]) => {
            let id = nanoid(10);
            let isRetry = false;

            if (Array.isArray(socket)) {
                isRetry = true;
                id = socket[0];
                socket = socket[1];
            }

            // Log Received
            $.logCalmly(`RECEIVED|${now()}| ${id} | ${event}`);

            if (logArgs) {
                try {
                    $.logCalmly(JSON.parse(JSON.stringify(args)));
                } catch (e) {
                    $.logCalmly(`Could not parse args: ${e.message}`);
                }
            }

            // Run Controllers function
            try {
                if (typeof $controller === "function") {
                    await $controller(this.makeControllerContext(id, socket), ...args);
                } else {
                    await $controller[method!](this.makeControllerContext(id, socket), ...args);
                }

                if (isRetry) {
                    this.db.markAsSuccessful(id);
                    socket.emit(`RemoveFromPending:${this.#secretKey}`, id);
                }

                // Log Completed
                $.logSuccess(`    DONE|${now()}| ${id} | ${event}`);
            } catch (e) {
                if (isRetry) {
                    socket.emit(`RemoveFromPending:${this.#secretKey}`, id);
                }

                this.db.recordFailedEvent(
                    {
                        event,
                        eventId: id,
                        args
                    },
                    e
                );

                this.triggerRetryFailedEvents(socket);

                $.logError(`‼️    ERROR|${now()}| ${id} | ${event} --- ${e.message}`);
            }
        };

        // Set Function name to event name.
        Object.defineProperty(WrappedHandler, "name", { value: `Wrapped_${event}` });

        return WrappedHandler;
    }

    /**
     * Make Controller Context using socket passed.
     * @param id
     * @param socket
     * @private
     */
    private makeControllerContext(id: string, socket: Socket): EventsControllerContext {
        return <EventsControllerContext>{
            $: this.$,

            runEvent: (event, ...args) => {
                return this.runEvent(socket, event, ...args);
            },

            reply(severSideEvent: string, ...args: []) {
                return socket.emit(severSideEvent, ...args);
            }
        };
    }

    /**
     * Run an event.
     * @param socket
     * @param event
     * @param args
     * @private
     */
    private runEvent(socket: SocketOrIdAndSocket, event: string, ...args: any[]) {
        const events = this.getAllEvents();
        const eventData = events.find((e) => e.event === event);

        if (!eventData)
            throw Error(`RunEvent: "${event}" does not exist!, check spelling and try again.`);

        return eventData.handler(socket, ...args);
    }

    private retryFailedEvents(socket: Socket, force = false) {
        const $ = this.$;

        // Get all failed Events
        const failedEvents = this.db.failedEvents();
        // Get Ids
        const failedEventsIds = failedEvents.keys();

        if (!failedEventsIds.length) return this;

        let retied = 0;
        for (const key of failedEventsIds) {
            const { event, args, retries } = failedEvents.get(key) as FailedEvent;

            if (!force && retries.length >= 3) continue;

            $.logWarning(`RETRYING|${now()}| ${key} | ${event}`);
            retied++;

            setTimeout(() => {
                this.runEvent([key, socket], event, ...args);
            }, 1000);
        }

        if (retied) $.logWarning(`Retried (${retied}) failed events.`);

        return this;
    }

    private runPendingEvents(socket: Socket) {
        const $ = this.$;
        const db = new EventsServerDb($, true);

        // Get all failed Events
        const pendingEvents = db.pendingEvents();
        // Get Ids
        const keys = pendingEvents.keys();
        if (!keys.length) return this;

        // log
        $.logWarning(`(${keys.length}) Pending Events!`);

        for (const key of keys) {
            const { event, args } = pendingEvents.get(key) as PendingEvent;
            this.runEvent([key, socket], event, ...args);
        }

        return this;
    }
}

export = EventsServer;
