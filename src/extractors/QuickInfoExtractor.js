import { ExportHelpers } from "../utils/ExportHelpers.js";

export function extractQuickInfo(actor) {
    const sys = actor.system;
    const mode = sys.activeMovementName || "Running";
    const bmr = ExportHelpers.getWalkRate(sys._movementBlock?._table?.[mode]);

    const init = sys._totalInitiativeBonus || 0;

    const pEnc = sys._injuryBlock?._endurance?._bonusWithRacial ?? 0;
    const mEnc = sys._injuryBlock?._concentration?._bonusWithRacial ?? 0;

    // The movement mode may be a skill name or, for some creatures, a full localisation key.
    const modeLabel = ExportHelpers.safeLocalize(mode, "RMU.Skills");

    return {
        bmr_value: ExportHelpers.formatPerRound(bmr),
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
