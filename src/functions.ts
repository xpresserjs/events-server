import moment from "moment";
import crypto = require("crypto");

export function now(date?: Date | string) {
    return moment(date).format("D/MM/yyyy|HH:mm:ss.SSSS");
}



/**
 * Create Md5 hash function
 * @param str
 */
export function md5(str: string): string {
    return crypto.createHash("md5").update(str).digest("hex");
}
