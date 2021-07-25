# Xpresser Events Server Plugin
##### STAGE: DEVELOPMENT

XpresserJs Events Server is a standalone server that uses your xpresser instance i.e `$` to run tasks you have defined.

Unlike the current events system i.e `$.events.emit("doSomething")`, The Events server was created for handling heavy tasks outside the process of your HTTP requests server.
```js
// Without Events Server
$.events.define("sayHello", () => $.log("Hello Dev!"))

// The somewhere in your app you call
$.events.emit("sayHello");
```
This event runs in the background but in same process. This may slow down HTTP requests when using it to handle heavy duty events.
This is where **EVENTS SERVER** comes into place.

The Events Server uses xpresser behind the scenes but without HTTP (cli only).
###### Create: events-server.ts
```ts
import $ from "path/to/your/exported/xpresser/instance";
import EventServer from "@xpresser/events-server"

const es = new EventServer("SECRET_KEY", $)

// uses xpresser router behind the scenes.
es.on("convertVideo", "VideoController@convert");

// Start listening to events
es.startListening()
```
**Note:** your imported xpresser instance should not call `$.boot()`

###### Create: backend/EventsServer/Controllers/VideoController.ts
```ts
export = {
  convert(es){
    // Do whatever
    es.reply("VideoConverted", {id: videoId})
  }
}
```
Run the file and you will have your `Xpresser Events Server` ready to take commands on a standalone server, using your xpresser config and plugins.
