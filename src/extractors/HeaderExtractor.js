import { ExportHelpers } from "../utils/ExportHelpers.js";

export function extractHeader(actor) {
    const sys = actor.system;
    const unknownTxt = ExportHelpers.i18n("RMU_EXPORT.Common.Unknown", "Unknown");
    const noneTxt = ExportHelpers.i18n("RMU_EXPORT.Common.None", "None");
    const getSystemLabel = (prefix, val) => ExportHelpers.localizeWithPrefix(prefix, val) || unknownTxt;
    const realmLabel = ExportHelpers.localizeWithPrefix("RMU.RealmsOfMagic", sys.realm) || noneTxt;
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
