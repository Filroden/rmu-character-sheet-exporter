import { ExportHelpers } from "../utils/ExportHelpers.js";

export function extractHeader(actor) {
    const sys = actor.system;
    const unknownTxt = ExportHelpers._i18n("RMU_EXPORT.Common.Unknown", "Unknown");
    const noneTxt = ExportHelpers._i18n("RMU_EXPORT.Common.None", "None");
    const getSystemLabel = (prefix, val) => {
        if (!val) return unknownTxt;
        const key = `${prefix}.${val}`;
        if (game.i18n.has(key)) return game.i18n.localize(key);
        return val;
    };
    let realmLabel = sys.realm || noneTxt;
    if (sys.realm) {
        const realmKey = `RMU.RealmsOfMagic.${sys.realm}`;
        if (game.i18n.has(realmKey)) realmLabel = game.i18n.localize(realmKey);
    }
    return {
        name: actor.name,
        race: getSystemLabel("RMU.Race", sys._header?._raceName),
        culture: getSystemLabel("RMU.Culture", sys._header?._cultureName),
        profession: getSystemLabel("RMU.Profession", sys._header?._professionName),
        level: sys.experience?.level ?? 1,
        xp: sys.experience?.xp ?? 0,
        realm: realmLabel,
        size: getSystemLabel("RMU.Size", sys.appearance?.size),
    };
}
