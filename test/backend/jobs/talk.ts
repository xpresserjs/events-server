import JobHelper from "xpresser/src/Console/JobHelper";
import { $ } from "../../xpresser";

/**
 *  Job: Talk
 */
export = {
    // Job Handler
    async handler(args: string[], job: JobHelper): Promise<any> {
        // Your Job Here
        await job.$.startEServerCommunicator();
        $.eServer.emit("hello", 10000);

        // End current job process..
    }
};
