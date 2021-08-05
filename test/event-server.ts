import { $ } from "./xpresser";
import { EventsServer } from "../";

const es = new EventsServer("SECRET_KEY", $);

es.startListening();
