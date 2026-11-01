import { utimes } from "node:fs/promises";

/** Set access and modification time to a release date ("YYYY-MM-DD", 00:00 UTC). */
export async function setReleaseDate(filePath, date) {
    const match = /^(\d{4}-\d{2}-\d{2})/.exec(date ?? "");
    if (!match) return false;

    const time = new Date(`${match[1]}T00:00:00Z`);
    if (Number.isNaN(time.getTime())) return false;

    await utimes(filePath, time, time);
    return true;
}
