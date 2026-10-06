import { ExportHelpers } from "../utils/ExportHelpers.js";

export function extractMovement(actor) {
    const sys = actor.system;
    const moveBlock = sys._movementBlock || {};
    const tables = moveBlock._table || {};
    const activeMode = sys.activeMovementName || "Running";
    const bmrSummary = [];
    Object.keys(tables).forEach((modeKey) => {
        const table = tables[modeKey];
        if (!table.paceRates) return;

        bmrSummary.push({
            mode: ExportHelpers.localizeWithPrefix("RMU.Skills", modeKey),
            bmr: ExportHelpers.formatPerRound(ExportHelpers.getWalkRate(table)),
        });
    });

    return {
        active_mode_name: ExportHelpers.localizeWithPrefix("RMU.Skills", activeMode),
        bmr_summary: bmrSummary,
    };
}
