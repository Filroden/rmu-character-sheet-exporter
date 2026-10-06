import { ExportHelpers } from "../utils/ExportHelpers.js";

export function extractTalents(actor) {
    const talents = actor.items.filter((i) => i.type === "talent" || i.type === "trait");
    const grouped = {};
    const generalTxt = ExportHelpers.i18n("RMU_EXPORT.Common.General", "General");

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
            const displayGroup = key === "General" ? generalTxt : ExportHelpers.i18n(key, key);

            return {
                group: displayGroup,
                entries: grouped[key],
            };
        });
}
