import { getInstance } from "xpresser";
import { Obj } from "object-collection/exports";

const $ = getInstance();
const accessDbPath = $.path.storage("events-server/control-panel.json");

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
