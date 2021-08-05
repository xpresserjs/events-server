import type { DollarSign } from "xpresser/types";
export type EventRoute = {
    url: string;
    method: string;
    path: string;
    controller: any;
};

export type EventDetails = { eventId: string; event: string; args: any[] };

export type EventsArray = Array<{ event: string; handler: any; controller: string }>;
export interface EventsControllerContext {
    $: DollarSign;
    runEvent(event: string, ...args: any[]): any;
    reply(severSideEvent: string, ...args: any[]): any;
}

export type EventHandlerFn = (ctx: EventsControllerContext, ...args: any[]) => any;
export type EventsController = Record<string, string | EventHandlerFn>;
