import moment from "moment";
import { DollarSign } from "xpresser/types";
import { Obj } from "object-collection/exports";
import { Abolish } from "abolish";
import { EventsServerConfig } from "./Types";
import crypto = require("crypto");

/**
 * Get current date formatted.
 * @param date
 */
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

/**
 * load events server config
 * @param $
 * @param omitSecretKey
 */
export function loadEventServerConfig(
    $: DollarSign,
    omitSecretKey = false
): [any, EventsServerConfig?] {
    // Get EventsServer Config
    let eventsServerConfig: EventsServerConfig = $.config.get("eventsServer");

    // Return error and stop process if eventsServer is not defined.
    if (!eventsServerConfig) return [new Error("Config: {eventsServer} is required!")];

    if ($.engineData.has("eventsServerConfigLoaded")) {
        return [undefined, eventsServerConfig];
    }

    eventsServerConfig = Obj({
        server: "localhost",
        port: 7000,
        keepAlive: false,
        logs: { args: false },
        dbPaths: {
            server: "./storage/events-server/serverDB.json",
            access: "./storage/events-server/accessDB.json",
            communicator: "./storage/events-server/communicatorDB.json"
        },
        controlPanel: {
            enabled: true,
            password: "password",
            routePath: "/__es__"
        }
    })
        .merge(eventsServerConfig)
        .all();

    const abolish = new Abolish();
    const [err] = abolish.validate(eventsServerConfig, {
        secretKey: [
            "required|typeof:string",
            { $name: "{eventsServer.secretKey}", $skip: omitSecretKey }
        ],
        port: ["required|typeof:number", { $name: "{eventsServer.port}" }],
        "dbPaths.server": ["required|typeof:string", { $name: "{eventsServer.dbPaths.server}" }],
        "dbPaths.access": ["required|typeof:string", { $name: "{eventsServer.dbPaths.access}" }],
        "dbPaths.communicator": [
            "required|typeof:string",
            { $name: "{eventsServer.dbPaths.communicator}" }
        ]
    });

    // Set config to merged config.
    $.engineData.set("eventsServerConfigLoaded", true);
    $.config.set("eventsServer", eventsServerConfig);

    return [err, eventsServerConfig];
}
