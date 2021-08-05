import "xpresser/types";
import EventsServerCommunicator from "./src/EventsServerCommunicator";

declare module "xpresser/types" {
    interface DollarSign {
        eServer: EventsServerCommunicator;
    }
}
