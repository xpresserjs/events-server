import { $ } from "./xpresser";
import { EventsServer } from "../js/index";

const es = new EventsServer("SECRET_KEY", $);

es.on("hello", () => {
    // @ts-ignore
    console.log("Hi");
});

es.startListening();
