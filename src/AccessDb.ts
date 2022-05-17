/**
 * Access Database
 * Using object-collection to mock a database
 */
import { getInstance } from "xpresser";
import { Obj } from "object-collection/exports";

const $ = getInstance();
const accessDbPath = $.config.get("eventsServer.dbPaths.access");

/**
 * Start Access Db
 */
export const accessDb = Obj({});

// Get current access states
if ($.file.exists(accessDbPath)) {
    accessDb.replaceData($.file.readJson(accessDbPath));
}

// Save current access states.
export function saveAccessDb() {
    $.file.saveToJson(accessDbPath, accessDb.all(), { checkIfFileExists: false });
}
