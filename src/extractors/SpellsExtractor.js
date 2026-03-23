import { ExportHelpers } from "../utils/ExportHelpers.js";

export function extractSpells(actor) {
    const rawSpells = actor.system._spells || [];
    const spellGroups = [];

    if (Array.isArray(rawSpells)) {
        rawSpells.forEach((typeGroup) => {
            let listType = typeGroup.listType;
            if (game.i18n.has(`RMU.SpellListType.${listType}`)) {
                listType = game.i18n.localize(`RMU.SpellListType.${listType}`);
            }

            if (typeGroup.spellLists) {
                typeGroup.spellLists.forEach((list) => {
                    const knownSpells = (list.spells || []).filter((s) => s.known);

                    if (knownSpells.length > 0) {
                        const translatedListName = game.i18n.localize(list.spellListName);

                        spellGroups.push({
                            listName: translatedListName,
                            type: listType,
                            spells: knownSpells.map((s) => ({
                                name: game.i18n.localize(s.name),
                                level: s.level,
                                scr: s.scr ?? 0,
                                ob: s._hasOB ? ExportHelpers.formatBonus(s._totalBonus) : "—",
                                aoe: s.aoe || "—",
                                duration: s.duration || "—",
                                range: s.range || "—",
                                type: s.spellType || "—",
                            })),
                        });
                    }
                });
            }
        });
    }
    return spellGroups;
}
