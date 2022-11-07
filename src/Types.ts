import type { DollarSign } from "xpresser/types";
import "xpresser/types";
import PlaneSocket from "./PlaneSocket";

export type EventRoute = {
    url: string;
    method: string;
    path: string;
    controller: any;
};

export type EventDetails = { eventId: string; event: string; args: any[] };

export type EventsArray = Array<{ event: string; handler: any; controller: string }>;

export interface EventsControllerContext {
    id: string;
    event: string;
    $: DollarSign;

    runEvent(event: string, ...args: any[]): any;

    reply(severSideEvent: string, ...args: any[]): any;
}

export type EventHandlerFn = (ctx: EventsControllerContext, ...args: any[]) => any;
export type EventsController = Record<string, string | EventHandlerFn>;

export type SocketOrIdAndSocket = PlaneSocket | [string, PlaneSocket];

export type EventsServerConfig = {
    secretKey: string;
    port: number;
    log: { args: boolean };
    dbPaths: {
        server: string;
        communicator: string;
    };
    controlPanel: {
        enabled: boolean;
        password: string;
        routePath: string;
    };
    communicatorName?: string;
};
