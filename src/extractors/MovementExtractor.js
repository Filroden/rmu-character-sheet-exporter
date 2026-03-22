import { ExportHelpers } from "../utils/ExportHelpers.js";

export function extractMovement(actor) {
    const moveBlock = sys._movementBlock || {};
    const tables = moveBlock._table || {};
    const activeMode = sys.activeMovementName || "Running";
    const isMetric = ExportHelpers.isMetric;

    let activeModeLabel = activeMode;
    const skillKey = `RMU.Skills.${activeMode}`;
    if (game.i18n.has(skillKey)) {
        activeModeLabel = game.i18n.localize(skillKey);
    }

    const bmrSummary = [];
    Object.keys(tables).forEach((modeKey) => {
        const table = tables[modeKey];
        if (!table.paceRates) return;

        const walkEntry = table.paceRates.find((p) => p.pace?.value === "Walk");
        const bmrVal = walkEntry?.perRound || 0;

        let bmrDisplay = `${bmrVal}'/rd`;
        if (isMetric) {
            bmrDisplay = `${ExportHelpers._toMetricMovement(bmrVal)}/rd`;
        }

        let label = modeKey;
        const key = `RMU.Skills.${modeKey}`;
        if (game.i18n.has(key)) label = game.i18n.localize(key);

        bmrSummary.push({
            mode: label,
            bmr: bmrDisplay,
        });
    });

    return {
        active_mode_name: activeModeLabel,
        bmr_summary: bmrSummary,
    };
}
