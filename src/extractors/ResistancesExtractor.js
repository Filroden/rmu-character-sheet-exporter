import { ExportHelpers } from "../utils/ExportHelpers.js";

export function extractResistances(actor) {
    const sys = actor.system;
    const block = sys._resistanceBlock || sys.resistanceBlock || {};
    const list = block._resistances || block.resistances || sys._resistances || sys.resistances || [];

    const resistanceKeys = ["Channeling", "Essence", "Mentalism", "Physical", "Fear"];

    const findRes = (name) => {
        const r = list.find((x) => x.name.toLowerCase().includes(name.toLowerCase()));
        return r ? (r.total ?? r.bonus ?? 0) : 0;
    };

    return resistanceKeys.map((key) => {
        const systemKey = `RMU.Resistance.${key}`;
        let label = game.i18n.localize(systemKey);

        if (label === systemKey) {
            label = ExportHelpers.i18n(`RMU_EXPORT.Resistances.${key}`, key);
        }

        return {
            label: label,
            bonus: ExportHelpers.formatBonus(findRes(key)),
        };
    });
}
