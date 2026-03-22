import { ExportHelpers } from "../utils/ExportHelpers.js";

export function extractSkills(actor) {
    const src = actor.system._skills;
    if (!src) return [];

    const allSkills = [];

    const collectSkills = (node) => {
        if (!node) return;
        if (Array.isArray(node)) {
            node.forEach((child) => collectSkills(child));
            return;
        }
        if (typeof node === "object") {
            if (node.system && node.system._canDevelop === true) {
                allSkills.push(node.system);
                return;
            }
            if (node._canDevelop === true) {
                allSkills.push(node);
                return;
            }
            Object.keys(node).forEach((key) => {
                if (key !== "system") collectSkills(node[key]);
            });
        }
    };

    collectSkills(src);

    const grouped = {};
    const generalTxt = ExportHelpers._i18n("RMU_EXPORT.Common.General", "General");

    allSkills.forEach((s) => {
        const rawCat = s.category || "General";
        if (!grouped[rawCat]) grouped[rawCat] = [];

        if (options.showAllSkills || s._totalRanks > 0 || s.favorite) {
            let finalBonus = s._bonus ?? s.bonus ?? 0;

            let displayName = s.name;
            const skillKey = `RMU.Skills.${s.name}`;
            if (game.i18n.has(skillKey)) {
                displayName = game.i18n.localize(skillKey);
            }

            let displaySpec = s.specialization || "";
            if (displaySpec) {
                const specKey = `RMU.Specializations.${displaySpec}`;
                if (game.i18n.has(specKey)) {
                    displaySpec = game.i18n.localize(specKey);
                }
            }

            grouped[rawCat].push({
                sortName: s.name,
                name: displayName,
                specialisation: displaySpec,
                ranks: s._totalRanks ?? 0,
                bonus: ExportHelpers._formatBonus(finalBonus),
            });
        }
    });

    return Object.keys(grouped)
        .filter((key) => grouped[key].length > 0)
        .sort()
        .map((rawKey) => {
            let displayCat = rawKey;
            if (rawKey === "General") {
                displayCat = generalTxt;
            } else {
                const catKey = `RMU.SkillCategory.${rawKey}`;
                if (game.i18n.has(catKey)) {
                    displayCat = game.i18n.localize(catKey);
                }
            }

            const sortedList = grouped[rawKey].sort((a, b) => a.sortName.localeCompare(b.sortName));

            return {
                category: displayCat,
                list: sortedList,
            };
        });
}
