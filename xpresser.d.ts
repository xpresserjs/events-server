import "xpresser/types";
import EventsServerCommunicator from "./js/src/EventsServerCommunicator";

declare module "xpresser/types" {
    interface DollarSign {
        eServer: EventsServerCommunicator;
        startEServerCommunicator: (connect?: boolean) => Promise<void>;
    }
}
