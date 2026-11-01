import { createProviders } from "../providers/index.js";
import { downloadImage } from "../providers/images.js";
import { probe } from "../media/probe.js";
import { writeMedia } from "../media/index.js";
import { createCache } from "./cache.js";

/**
 * Everything a command needs, in one object. Passing it around (instead of
 * importing globals) is what lets tests swap in fakes.
 */
export function createContext(options) {
    return {
        options,
        providers: createProviders({ tv: options.provider }),
        cache: createCache(),
        probe,
        downloadImage,
        writeMedia,
        manualSeason: null,
    };
}
