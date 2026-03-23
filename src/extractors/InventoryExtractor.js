import { ExportHelpers } from "../utils/ExportHelpers.js";

export function extractInventory(actor) {
    const enc_penalty = actor.system._encManeuverPenalty;
    const items = actor.system._inventory || [];
    const unknownTxt = ExportHelpers.i18n("RMU_EXPORT.Common.Unknown", "Unknown");

    const itemList = items.map((i) => {
        const weight = i.system?.weight || i.system?._weight?.weight || 0;
        const qty = i.system?.quantity || 1;
        const rawCost = i.system?.cost || 0;

        let itemName = i.item?.name || i.system?.name || unknownTxt;
        itemName = game.i18n.localize(itemName);

        let weightDisplay = ExportHelpers.isMetric ? ExportHelpers.toMetricWeight(weight) : `${weight} lbs`;

        let status = i.system?.equipped || "carried";
        status = status.charAt(0).toUpperCase() + status.slice(1);

        let strength = i.system?.strength !== undefined && i.system?.strength !== null ? i.system?.strength : "—";
        let breakage = strength !== "—" && i.system?._breakagePenalty ? i.system._breakagePenalty : "—";

        return {
            name: itemName,
            qty: qty,
            weight: weightDisplay,
            cost: `${rawCost} sp`,
            depth: i._depth || 0,
            status: status,
            strength: strength,
            breakage: breakage,
        };
    });

    let maxPace = "Dash";
    if (actor.system._movementBlock?.maxPaceForLoadLabel) {
        maxPace = game.i18n.localize(actor.system._movementBlock.maxPaceForLoadLabel);
    } else if (actor.system.encumbrance?.pace) {
        maxPace = actor.system.encumbrance.pace;
    }

    const allowance = actor.system._loadAllowed?.weight ?? 0;
    const carried = actor.system._carriedWeight?.weight ?? 0;

    const cleanAllowance = Math.round(Number(allowance) * 100) / 100;
    const cleanCarried = Math.round(Number(carried) * 100) / 100;

    let allowanceDisplay = ExportHelpers.isMetric ? ExportHelpers.toMetricWeight(cleanAllowance) : `${cleanAllowance} lbs`;
    let carriedDisplay = ExportHelpers.isMetric ? ExportHelpers.toMetricWeight(cleanCarried) : `${cleanCarried} lbs`;

    return {
        weight_allowance: allowanceDisplay,
        weight_carried: carriedDisplay,
        enc_penalty: enc_penalty || 0,
        max_pace: maxPace,
        items: itemList,
    };
}
