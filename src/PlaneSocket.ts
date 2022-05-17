/**
 * After making a tough decision to quit socket.io
 * In order to make connections light and plane.
 *
 * I found out the default `net` module needs a parser
 * To feel socket.io like.
 *
 * - Read Streams
 * - Send writes as emits.
 */
import {Socket} from "net";

class PlaneSocket {
    public socket: Socket;
    public socketProvider?: () => Socket;
    public events: Record<string, (...args: any[]) => any>;
    public keepAliveRetries: number = 0;
    private keepAlive: boolean = false;

    constructor(socket: Socket | (() => Socket)) {
        this.events = {};

        if (typeof socket === "function") {
            this.socket = socket();
            this.socketProvider = socket;
        } else {
            this.socket = socket;
        }
    }

    public $keepAlive() {
        if (this.socketProvider) this.keepAlive = true;
        return this;
    }

    public $setupListeners() {
        type PlaneSocketData = {
            __ps__: boolean;
            event: string;
            args: any;
        };

        if (this.keepAlive) {
            if (this.keepAliveRetries >= 5) {
                clearIntervalConnect();
                return;
            }

            this.socket.on("connect", () => {
                this.keepAliveRetries = 0;
                clearIntervalConnect();
            });

            this.socket.on("error", () => {
                launchIntervalConnect(this);
            });

            this.socket.on("close", () => {
                launchIntervalConnect(this);
            });

            this.socket.on("end", () => {
                launchIntervalConnect(this);
            });
        }

        this.socket.on("data", (data) => {
            if (!data) return;
            let parsed: Omit<PlaneSocketData, "__ps__">;

            try {
                const {__ps__, ...others}: PlaneSocketData = JSON.parse(data.toString());

                // Check if data is from a plane socket lib.
                if (!__ps__) return console.error(`Cannot parse non PlaneSocket data!`);

                parsed = others;
            } catch (e: any) {
                return console.error(e);
            }

            if (this.events.hasOwnProperty(parsed.event)) {
                this.events[parsed.event](...parsed.args);
            }
        });
    }

    on(event: string, fn: (...args: any[]) => any) {
        this.events[event] = fn;

        return this;
    }

    emit(event: string, ...args: any[]) {
        const data = JSON.stringify({
            __ps__: true,
            event,
            args
        });

        this.socket.write(data);

        return this;
    }
}

export default PlaneSocket;

let intervalConnect: false | NodeJS.Timer = false;

/**
 * This function retries connecting to server 5 times.
 * @param ps
 */
function launchIntervalConnect(ps: PlaneSocket) {
    // return if an interval has already been set.
    if (intervalConnect) return;

    intervalConnect = setInterval(() => {
        // Reset socketProvider.
        ps.socket = ps.socketProvider!();
        // Increment Retires
        ps.keepAliveRetries++;
        // Listen for events
        ps.$setupListeners();
    }, 5000);
}

function clearIntervalConnect() {
    if (false === intervalConnect) return;
    clearInterval(intervalConnect);
    intervalConnect = false;
}
