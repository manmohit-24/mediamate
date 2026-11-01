import { requestBuffer } from "./http.js";
import { sniffImageMime } from "../core/image.js";

/** Download an image. Returns { data: Buffer, mime } (mime sniffed from the bytes). */
export async function downloadImage(url) {
    const data = await requestBuffer(url);
    return { data, mime: sniffImageMime(data) };
}
