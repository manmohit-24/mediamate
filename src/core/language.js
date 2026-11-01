let names = null;

/** ISO language code -> English name ("hi" -> "Hindi"). Unknown codes are returned as-is. */
export function getLanguageName(code) {
    if (!code || code === "und") return "Unknown";

    try {
        names ??= new Intl.DisplayNames(["en"], { type: "language" });
        return names.of(code) ?? code;
    } catch {
        return code;
    }
}

/** "en-US" -> "en", missing -> "und" */
export function normalizeLanguage(code) {
    return code?.toLowerCase().split("-")[0].trim() || "und";
}
