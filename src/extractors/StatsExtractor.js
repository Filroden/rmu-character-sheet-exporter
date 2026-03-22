import { ExportHelpers } from "../utils/ExportHelpers.js";

export function extractStats(actor) {
    const statKeys = ["Ag", "Co", "Em", "In", "Me", "Pr", "Qu", "Re", "SD", "St"];
    const stats = [];
    const sourceBlock = sys._statBlock || {};

    for (const key of statKeys) {
        const data = sourceBlock[key];
        if (!data) continue;

        const systemKey = `rmu.stats.${key}`;
        let label = game.i18n.localize(systemKey);

        if (label === systemKey) {
            label = ExportHelpers._i18n(`RMU_EXPORT.Stats.${key}`, key);
        }

        stats.push({
            label: label,
            bonus: ExportHelpers._formatBonus(data.total ?? 0),
            tmp: data.tmp ?? 50,
            pot: data.pot ?? 50,
        });
    }
    return stats;
}
