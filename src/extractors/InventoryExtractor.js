import { ExportHelpers } from "../utils/ExportHelpers.js";

// Items with no equipment state are being carried.
const DEFAULT_EQUIPMENT_STATE = "carried";

/**
 * Localises an item's equipment state (e.g. "equipped"), falling back to the raw value with
 * a capital first letter if the system has no translation for it.
 * @param {string} state - The raw equipment state.
 * @returns {string}
 */
function formatEquipmentState(state) {
    const fallback = state.charAt(0).toUpperCase() + state.slice(1);
    return ExportHelpers.i18n(`RMU.EquipmentState.${state}`, fallback);
}

export function extractInventory(actor) {
    const enc_penalty = actor.system._encManeuverPenalty;
    const items = actor.system._inventory || [];
    const unknownTxt = ExportHelpers.i18n("RMU_EXPORT.Common.Unknown", "Unknown");

    const itemList = items.map((i) => {
        const weight = i.system?.weight || i.system?._weight?.weight || 0;
        const qty = i.system?.quantity || 1;
        const rawCost = i.system?.cost || 0;

        const itemName = game.i18n.localize(i.item?.name || i.system?.name || unknownTxt);

        const status = formatEquipmentState(i.system?.equipped || DEFAULT_EQUIPMENT_STATE);

        const strength = i.system?.strength ?? "—";
        const breakage = strength !== "—" && i.system?._breakagePenalty ? i.system._breakagePenalty : "—";

        return {
            name: itemName,
            qty: qty,
            weight: ExportHelpers.formatWeight(weight),
            cost: ExportHelpers.formatCost(rawCost),
            depth: i._depth || 0,
            status: status,
            strength: strength,
            breakage: breakage,
        };
    });

    let maxPace = ExportHelpers.i18n("RMU.PacePenalty.Dash", "Dash");
    if (actor.system._movementBlock?.maxPaceForLoadLabel) {
        maxPace = game.i18n.localize(actor.system._movementBlock.maxPaceForLoadLabel);
    } else if (actor.system.encumbrance?.pace) {
        maxPace = actor.system.encumbrance.pace;
    }

    const allowance = actor.system._loadAllowed?.weight ?? 0;
    const carried = actor.system._carriedWeight?.weight ?? 0;

    const cleanAllowance = Math.round(Number(allowance) * 100) / 100;
    const cleanCarried = Math.round(Number(carried) * 100) / 100;

    return {
        weight_allowance: ExportHelpers.formatWeight(cleanAllowance),
        weight_carried: ExportHelpers.formatWeight(cleanCarried),
        enc_penalty: enc_penalty || 0,
        max_pace: maxPace,
        items: itemList,
    };
}
