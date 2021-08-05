import moment from "moment";
import crypto = require("crypto");
import { DollarSign } from "xpresser/types";
import { Obj } from "object-collection/exports";
import { Abolish } from "abolish";
import { EventsServerConfig } from "./Types";

export function now(date?: Date | string) {
    return moment(date).format("D/MM/yyyy|HH:mm:ss.SSSS");
}

/**
 * Create Md5 hash function
 * @param str
 */
export function md5(str: string): string {
    return crypto.createHash("md5").update(str).digest("hex");
}

export function loadEventServerConfig(
    $: DollarSign,
    omitSecretKey = false
): [any, EventsServerConfig?] {
    const abolish = new Abolish();

    // Get EventsServer Config
    let eventsServerConfig: EventsServerConfig = $.config.get("eventsServer");

    // Return error and stop process if eventsServer is not defined.
    if (!eventsServerConfig) return [new Error("Config: {eventsServer} is required!")];

    eventsServerConfig = Obj({
        port: 7000,
        logs: { args: false },
        dbPaths: {
            server: "./storage/events-server/serverDB.json",
            communicator: "./storage/events-server/communicatorDB.json"
        }
    })
        .merge(eventsServerConfig)
        .all();

    const [err] = abolish.validate(eventsServerConfig, {
        secretKey: [
            "required|typeof:string",
            { $name: "{eventsServer.secretKey}", $skip: omitSecretKey }
        ],
        port: ["required|typeof:number", { $name: "{eventsServer.port}" }],
        "dbPaths.server": ["required|typeof:string", { $name: "{eventsServer.dbPaths.server}" }],
        "dbPaths.communicator": [
            "required|typeof:string",
            { $name: "{eventsServer.dbPaths.communicator}" }
        ]
    });

    return [err, eventsServerConfig];
}
