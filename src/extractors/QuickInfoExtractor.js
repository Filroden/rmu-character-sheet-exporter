import { ExportHelpers } from "../utils/ExportHelpers.js";

export function extractQuickInfo(actor) {
    let bmr = 0;
    const sys = actor.system;
    const mode = sys.activeMovementName || "Running";
    const moveData = sys._movementBlock || {};
    const modeTable = moveData._table?.[mode];

    if (modeTable?.paceRates) {
        const walkEntry = modeTable.paceRates.find((p) => p.pace?.value === "Walk");
        bmr = walkEntry?.perRound || 0;
    }

    const init = sys._totalInitiativeBonus || 0;

    const pEnc = sys._injuryBlock?._endurance?._bonusWithRacial ?? 0;
    const mEnc = sys._injuryBlock?._concentration?._bonusWithRacial ?? 0;

    let modeLabel = mode;
    const skillKey = `RMU.Skills.${mode}`;

    if (game.i18n.has(skillKey)) {
        modeLabel = game.i18n.localize(skillKey);
    } else if (game.i18n.localize(mode) !== mode) {
        modeLabel = game.i18n.localize(mode);
    }

    let bmrDisplay = `${bmr}'/rd`;
    if (ExportHelpers.isMetric) {
        bmrDisplay = `${ExportHelpers.toMetricMovement(bmr)}/rd`;
    }

    return {
        bmr_value: bmrDisplay,
        bmr_mode: modeLabel,
        initiative: ExportHelpers.formatBonus(init),
        hits: {
            current: sys.health?.hp?.value ?? 0,
            max: sys.health?.hp?.max ?? 0,
        },
        endurance_physical: ExportHelpers.formatBonus(pEnc),
        endurance_mental: ExportHelpers.formatBonus(mEnc),
        power: {
            current: sys.health?.power?.value ?? 0,
            max: sys.health?.power?.max ?? 0,
        },
    };
}
