import { ExportHelpers } from "../utils/ExportHelpers.js";

export function extractTalents(actor) {
    const talents = actor.items.filter((i) => i.type === "talent" || i.type === "trait");
    const grouped = {};
    const generalTxt = ExportHelpers._i18n("RMU_EXPORT.Common.General", "General");

    talents.forEach((t) => {
        const group = t.system.category || "General";
        if (!grouped[group]) grouped[group] = [];

        const translatedName = game.i18n.localize(t.name);

        grouped[group].push({
            name: translatedName,
            tier: t.system.tier || "",
        });
    });

    return Object.keys(grouped)
        .sort()
        .map((key) => {
            let displayGroup = key;
            if (key === "General") displayGroup = generalTxt;
            else if (game.i18n.has(key)) displayGroup = game.i18n.localize(key);

            return {
                group: displayGroup,
                entries: grouped[key],
            };
        });
}
