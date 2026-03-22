import { ExportHelpers } from "../utils/ExportHelpers.js";

export function extractDefenses(actor) {
    const dbBlock = sys._dbBlock || {};
    const quDb = dbBlock.quicknessDB ?? 0;
    const armorDb = dbBlock.armorDB ?? 0;
    const otherDb = sys.defense?.other ?? 0;
    const shieldBonus = sys.defenses?.shield?.bonus || 0;
    const baseTotal = quDb + armorDb + otherDb;

    let dodgeOpts = dbBlock.dodgeOptions || (actor._cachedDodge ? actor._cachedDodge : []);
    let blockOpts = dbBlock.blockOptions || (actor._cachedBlock ? actor._cachedBlock : []);

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
        let totalBlock = baseTotal + currentBlockMod + shieldBonus;

        if (modeKey !== "passive") {
            totalDodge += passiveBlockMod;
            totalBlock += passiveDodgeMod;
        }

        return {
            mode: ExportHelpers._i18n(`RMU_EXPORT.DefenseMode.${labelKey}`, labelKey),
            dodge: ExportHelpers._formatBonus(totalDodge),
            block: ExportHelpers._formatBonus(totalBlock),
        };
    };

    const armorData = sys._armorWorn || {};
    const noneTxt = ExportHelpers._i18n("RMU_EXPORT.Common.None", "None");

    const getArmorInfo = (loc) => {
        const part = armorData[loc];
        if (!part) return { name: noneTxt, at: 1 };

        let matName = part.piece?._base?.material || noneTxt;

        if (part.piece?._base?.material) {
            const rawMat = part.piece._base.material;
            const cleanMat = rawMat.replace(/\s+/g, "");

            const armorKey = `RMU.ArmorTypes.${cleanMat}`;
            if (game.i18n.has(armorKey)) {
                matName = game.i18n.localize(armorKey);
            }
        }

        return {
            name: matName,
            at: part.AT ?? 1,
        };
    };

    return {
        quickness_bonus: ExportHelpers._formatBonus(quDb),
        armor_db: ExportHelpers._formatBonus(armorDb),
        other_db: ExportHelpers._formatBonus(otherDb),
        total_db_current: ExportHelpers._formatBonus(dbBlock.totalDB ?? 0),
        tactical: [buildMode("Passive", "passive"), buildMode("Partial", "partial"), buildMode("Full", "full")],
        armor: {
            head: getArmorInfo("Head"),
            torso: getArmorInfo("Torso"),
            arms: getArmorInfo("Arms"),
            legs: getArmorInfo("Legs"),
        },
    };
}
