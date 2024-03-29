import type { DollarSign } from "xpresser/types";
import XpresserRouter from "@xpresser/router";
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
import { createServer, Server } from "net";
import PlaneSocket from "./PlaneSocket";

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

        // set isEventsServer = true;
        $.engineData.set("isEventsServer", true);
        // Change backend path
        $.config.set("paths.backend", "base://events-server");

        // xpresser instance
        this.$ = $;

        // New Router Instance.
        this.$router = new XpresserRouter();

        // Check launch type
        this.isCliCommand = $.engineData.get("LaunchType") === "cli";

        // if launch type is cli, change controller stub path.
        if (this.isCliCommand) {
            let customControllerStubPath = __dirname + "/controller.hbs";

            /**
             * Since Tsc does not move .hbs files we have to check.
             */
            if (customControllerStubPath.indexOf("/js/src/") > 0) {
                customControllerStubPath = customControllerStubPath.replace("/js/src/", "/src/");
            }

            $.config.set("artisan.factory.controller", customControllerStubPath);
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
                this.$.logCalmly(`Waiting for authenticated connection...`);
                this.addConnectionListener().server.listen(this.port);

                return next();
            });
        }

        // Boot Xpresser
        this.$.boot();
    }

    /**
     * Initialize Socket
     * @private
     */
    private initializeSocket() {
        this.server = createServer();

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
            const pSocket = new PlaneSocket(socket);

            pSocket.on("Authorize", (data) => {
                if (data.secretKey && data.secretKey === this.#secretKey) {
                    if (data.name) {
                        this.$.logCalmly(
                            `>>>>>>>>>>>>>>>>>>> LISTENING TO [${data.name}]  <<<<<<<<<<<<<<<<<<<<`
                        );
                    } else {
                        this.$.logCalmly(">>>>>>>>>>>>>>>>>>> LISTENING <<<<<<<<<<<<<<<<<<<<");
                    }

                    return this.listenToAllRoutes(pSocket);
                }

                return socket.emit("error", "Authorization Failed, Invalid SECRET_KEY!");
            });

            pSocket.$setupListeners();
        });

        return this;
    }

    private listenToAllRoutes(socket: PlaneSocket) {
        const events = this.getAllEvents();

        for (const event of events) {
            socket.on(event.event, (...args) => event.handler(socket, ...args));
        }

        socket.on("$retryFailedEvents", () => this.retryFailedEvents(socket, true));
        socket.on("$runPendingEvents", () => this.runPendingEvents(socket));

        socket.emit(`Authorized:${this.#secretKey}`);

        this.retryFailedEvents(socket);
        this.runPendingEvents(socket);
    }

    private triggerRetryFailedEvents(socket: PlaneSocket, secs: number = 10) {
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
        const logArgs = $.config.get("eventsServer.log.args", true);

        const WrappedHandler = async (socket: SocketOrIdAndSocket, ...args: any[]) => {
            let id = nanoid(10);
            let isRetry = false;

            if (Array.isArray(socket)) {
                isRetry = true;
                id = socket[0];
                socket = socket[1];
            }

            // Log Received

            if (logArgs) {
                try {
                    $.logCalmly(
                        `RECEIVED|${now()}| ${id} | ${event} | ` + "Args:" + JSON.stringify(args)
                    );
                } catch (e: any) {
                    $.logCalmly(`Could not parse args: ${e.message}`);
                }
            } else {
                $.logCalmly(`RECEIVED|${now()}| ${id} | ${event}`);
            }

            // Run Controllers function
            try {
                if (typeof $controller === "function") {
                    await $controller(this.makeControllerContext(id, socket, event), ...args);
                } else {
                    await $controller[method!](
                        this.makeControllerContext(id, socket, event),
                        ...args
                    );
                }

                if (isRetry) {
                    this.db.markAsSuccessful(id);
                    socket.emit(`RemoveFromPending:${this.#secretKey}`, id);
                }

                // Log Completed
                $.logSuccess(`    DONE|${now()}| ${id} | ${event}`);
            } catch (e: any) {
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
     * @param event
     * @private
     */
    private makeControllerContext(
        id: string,
        socket: PlaneSocket,
        event: string
    ): EventsControllerContext {
        return <EventsControllerContext>{
            id,
            event,
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

    private retryFailedEvents(socket: PlaneSocket, force = false) {
        const $ = this.$;

        // Get all failed Events
        const failedEvents = this.db.failedEvents();
        // Get Ids
        const failedEventsIds = failedEvents.keys();

        if (!failedEventsIds.length) return this;

        let retried = 0;
        for (const key of failedEventsIds) {
            const { event, args, retries } = failedEvents.get(key) as FailedEvent;

            if (!force && retries.length >= 3) continue;

            $.logWarning(`RETRYING|${now()}| ${key} | ${event}`);
            retried++;

            setTimeout(() => {
                this.runEvent([key, socket], event, ...args);
            }, 1000);
        }

        if (retried) $.logWarning(`Retried (${retried}) failed events.`);

        return this;
    }

    private runPendingEvents(socket: PlaneSocket, silently = false) {
        const $ = this.$;
        const db = new EventsServerDb($, true);

        // Get all failed Events
        const pendingEvents = db.pendingEvents();
        // Get Ids
        const keys = pendingEvents.keys();
        if (!keys.length) return this;

        // log
        if (!silently) $.logWarning(`(${keys.length}) Pending Events!`);

        for (const key of keys) {
            const { event, args } = pendingEvents.get(key) as PendingEvent;
            this.runEvent([key, socket], event, ...args);
        }

        return this;
    }
}

export = EventsServer;
