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
import { Socket } from "net";

class PlaneSocket {
    public socket: Socket;
    public socketProvider?: () => Socket;
    public events: Record<string, (...args: any[]) => any>;
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

    public $keepAlive(ms: number = 5000) {
        if (this.socketProvider) this.keepAlive = true;
        return this;
    }

    public $setupListeners() {
        type PlaneSocketData = {
            __ps__: boolean;
            event: string;
            arg: any;
        };

        if (this.keepAlive) {
            this.socket.on("connect", () => {
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
                const { __ps__, ...others }: PlaneSocketData = JSON.parse(data.toString());

                // Check if data is from a plane socket lib.
                if (!__ps__) return console.error(`Cannot parse non PlaneSocket data!`);

                parsed = others;
            } catch (e) {
                return console.error(e.message);
            }

            if (this.events.hasOwnProperty(parsed.event)) {
                this.events[parsed.event](parsed.arg);
            }
        });
    }

    on(event: string, fn: (...args: any[]) => any) {
        this.events[event] = fn;

        return this;
    }

    emit(event: string, arg?: any) {
        const data = JSON.stringify({
            __ps__: true,
            event,
            arg
        });

        this.socket.write(data);

        return this;
    }
}

export default PlaneSocket;

let intervalConnect: false | NodeJS.Timer = false;
function launchIntervalConnect(ps: PlaneSocket) {
    if (intervalConnect) return;
    intervalConnect = setInterval(() => {
        ps.socket = ps.socketProvider!();
        ps.$setupListeners();
    }, 10000);
}

function clearIntervalConnect() {
    if (false === intervalConnect) return;
    clearInterval(intervalConnect);
    intervalConnect = false;
}
