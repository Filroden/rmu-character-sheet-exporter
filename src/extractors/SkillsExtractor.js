import { ExportHelpers } from "../utils/ExportHelpers.js";

export function extractSkills(actor, options) {
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
    const generalTxt = ExportHelpers.i18n("RMU_EXPORT.Common.General", "General");

    allSkills.forEach((s) => {
        const rawCat = s.category || "General";
        if (!grouped[rawCat]) grouped[rawCat] = [];

        if (options.showAllSkills || s._totalRanks > 0 || s.favorite) {
            let finalBonus = s._bonus ?? s.bonus ?? 0;

            grouped[rawCat].push({
                sortName: s.name,
                name: ExportHelpers.localizeWithPrefix("RMU.Skills", s.name),
                specialisation: ExportHelpers.localizeWithPrefix("RMU.Specializations", s.specialization),
                ranks: s._totalRanks ?? 0,
                bonus: ExportHelpers.formatBonus(finalBonus),
            });
        }
    });

    return Object.keys(grouped)
        .filter((key) => grouped[key].length > 0)
        .sort()
        .map((rawKey) => {
            const displayCat = rawKey === "General" ? generalTxt : ExportHelpers.localizeWithPrefix("RMU.SkillCategory", rawKey);

            const sortedList = grouped[rawKey].sort((a, b) => a.sortName.localeCompare(b.sortName));

            return {
                category: displayCat,
                list: sortedList,
            };
        });
}
