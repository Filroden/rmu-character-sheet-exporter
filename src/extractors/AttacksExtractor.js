import { ExportHelpers } from "../utils/ExportHelpers.js";

export function extractAttacks(actor) {
    const attacks = actor.system._attacks || [];
    const unknownWpn = ExportHelpers.i18n("RMU_EXPORT.Common.UnknownWeapon", "Unknown Weapon");
    const unknownTxt = ExportHelpers.i18n("RMU_EXPORT.Common.Unknown", "Unknown");

    return attacks.map((a) => {
        let rangeDisplay = "";
        if (a.isRanged) {
            let rawRangeVal = a.usage?.range?.short;
            if (rawRangeVal !== undefined && rawRangeVal !== null) {
                rangeDisplay = ExportHelpers.isMetric ? `<${ExportHelpers.toMetricRange(rawRangeVal)}>` : `<${rawRangeVal}'>`;
            } else {
                let rawRangeStr = a.usage?.range?._shortRange;
                if (rawRangeStr) {
                    const cleanRange = String(rawRangeStr).replace(/['"a-zA-Z\s]/g, "");
                    if (ExportHelpers.isMetric) {
                        rangeDisplay = String(rawRangeStr).includes("m")
                            ? `<${cleanRange} m>`
                            : !isNaN(parseFloat(cleanRange))
                              ? `<${ExportHelpers.toMetricRange(parseFloat(cleanRange))}>`
                              : `<${cleanRange}>`;
                    } else {
                        rangeDisplay = `<${cleanRange}>`;
                    }
                }
            }
        }

        let reachDisplay = "";
        if (!rangeDisplay && a.meleeRange) {
            reachDisplay = ExportHelpers.isMetric ? ExportHelpers.toMetricReach(a.meleeRange) : `${Math.round(Number(a.meleeRange) * 100) / 100}'`;
        }

        let attackName = a.attackName || unknownWpn;
        if (game.i18n.has(`RMU.AttackTables.${a.attackName}`)) attackName = game.i18n.localize(`RMU.AttackTables.${a.attackName}`);
        else if (game.i18n.has(`RMU.Attacks.${a.attackName}`)) attackName = game.i18n.localize(`RMU.Attacks.${a.attackName}`);

        let chartName = game.i18n.has(`RMU.AttackTables.${a.chart.name}`) ? game.i18n.localize(`RMU.AttackTables.${a.chart.name}`) : a.chart.name || unknownTxt;
        let specialization = a.specialization
            ? game.i18n.has(`RMU.Specializations.${a.specialization}`)
                ? game.i18n.localize(`RMU.Specializations.${a.specialization}`)
                : a.specialization
            : unknownTxt;

        // NEW: Breakage hiding logic
        let strength = a.itemStrength !== undefined && a.itemStrength !== null ? a.itemStrength : "—";
        let breakage_dmg = strength !== "—" && a.damagePenalty ? a.damagePenalty : "—";

        return {
            name: attackName,
            specialization: specialization,
            handed: a.handed || "",
            ob: ExportHelpers.formatBonus(a.totalBonus ?? 0),
            damageType: chartName,
            fumble: a.fumble || 0,
            reach: reachDisplay,
            range: rangeDisplay,
            has_breakage: a.breakage === "true" || a.breakage === true,
            strength: strength,
            breakage_dmg: breakage_dmg,
        };
    });
}
