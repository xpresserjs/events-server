import { $ } from "./xpresser";
import { EventsServer } from "../js/index";

const es = new EventsServer("SECRET_KEY", $);

es.on("hello", () => {
    // @ts-ignore
    console.log("Hi");
});

es.on("fail", () => {
    throw new Error("Failed");
});

es.startListening();
