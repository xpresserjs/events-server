import EventsServerCommunicator from "./EventsServerCommunicator";

declare module "xpresser/types" {
    interface DollarSign {
        eServer: EventsServerCommunicator;
        startEventServerCommunicator: () => void;
    }
}