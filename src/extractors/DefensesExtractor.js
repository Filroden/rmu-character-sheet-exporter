import { ExportHelpers } from "../utils/ExportHelpers.js";

export function extractDefenses(actor) {
    const sys = actor.system;
    const dbBlock = sys._dbBlock || {};
    const quDb = dbBlock.quicknessDB ?? 0;
    const armorDb = dbBlock.armorDB ?? 0;
    const otherDb = sys.defense?.other ?? 0;
    const baseTotal = quDb + armorDb + otherDb;

    // The system's block option modifiers already include the bonus of the equipped shield,
    // so no separate shield term is added to the Block DB totals.
    const dodgeOpts = dbBlock.dodgeOptions || actor._cachedDodge || [];
    const blockOpts = dbBlock.blockOptions || actor._cachedBlock || [];

    const getModifier = (opts, modeValue) => {
        if (!Array.isArray(opts)) return 0;
        const found = opts.find((o) => o.value === modeValue);
        return found ? (found.modifier ?? 0) : 0;
    };

    const passiveDodgeMod = getModifier(dodgeOpts, "passive");
    const passiveBlockMod = getModifier(blockOpts, "passive");

    const buildMode = (labelKey, modeKey) => {
        const currentDodgeMod = getModifier(dodgeOpts, modeKey);
        const currentBlockMod = getModifier(blockOpts, modeKey);
        let totalDodge = baseTotal + currentDodgeMod;
        let totalBlock = baseTotal + currentBlockMod;

        if (modeKey !== "passive") {
            totalDodge += passiveBlockMod;
            totalBlock += passiveDodgeMod;
        }

        return {
            mode: ExportHelpers.i18n(`RMU_EXPORT.DefenseMode.${labelKey}`, labelKey),
            dodge: ExportHelpers.formatBonus(totalDodge),
            block: ExportHelpers.formatBonus(totalBlock),
        };
    };

    const armorData = sys._armorWorn || {};
    const noneTxt = ExportHelpers.i18n("RMU_EXPORT.Common.None", "None");

    const getArmorInfo = (loc) => {
        const part = armorData[loc];
        if (!part) return { name: noneTxt, at: 1 };

        const rawMat = part.piece?._base?.material;
        let matName = noneTxt;
        if (rawMat) {
            // Armour type keys have no spaces (e.g. "Soft Leather" is RMU.ArmorTypes.SoftLeather).
            matName = ExportHelpers.i18n(`RMU.ArmorTypes.${rawMat.replaceAll(/\s+/g, "")}`, rawMat);
        }

        return {
            name: matName,
            at: part.AT ?? 1,
        };
    };

    return {
        quickness_bonus: ExportHelpers.formatBonus(quDb),
        armor_db: ExportHelpers.formatBonus(armorDb),
        other_db: ExportHelpers.formatBonus(otherDb),
        total_db_current: ExportHelpers.formatBonus(dbBlock.totalDB ?? 0),
        tactical: [buildMode("Passive", "passive"), buildMode("Partial", "partial"), buildMode("Full", "full")],
        armor: {
            head: getArmorInfo("Head"),
            torso: getArmorInfo("Torso"),
            arms: getArmorInfo("Arms"),
            legs: getArmorInfo("Legs"),
        },
    };
}
