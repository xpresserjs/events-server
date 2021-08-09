import { $ } from "./xpresser";
import { EventsServer } from "../";

const es = new EventsServer("SECRET_KEY", $);

es.on("hello", () => {
    // @ts-ignore
    console.log("Hi");
});

es.startListening();
