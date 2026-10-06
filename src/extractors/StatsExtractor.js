import { ExportHelpers } from "../utils/ExportHelpers.js";

export function extractStats(actor) {
    const sys = actor.system;
    const statKeys = ["Ag", "Co", "Em", "In", "Me", "Pr", "Qu", "Re", "SD", "St"];
    const stats = [];
    const sourceBlock = sys._statBlock || {};

    for (const key of statKeys) {
        const data = sourceBlock[key];
        if (!data) continue;

        const label = ExportHelpers.i18n(`rmu.stats.${key}`, ExportHelpers.i18n(`RMU_EXPORT.Stats.${key}`, key));

        stats.push({
            label: label,
            bonus: ExportHelpers.formatBonus(data.total ?? 0),
            tmp: data.tmp ?? 50,
            pot: data.pot ?? 50,
        });
    }
    return stats;
}
