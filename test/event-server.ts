import { $ } from "./xpresser";
import { EventsServer } from "../";

const es = new EventsServer("SECRET_KEY", $);

es.on("hello", () => {
    console.log("Hi");
});

es.startListening();
