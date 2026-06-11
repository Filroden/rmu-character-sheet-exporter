import { ExportHelpers } from "../utils/ExportHelpers.js";

export function extractAttacks(actor) {
    const attacks = actor.system._attacks || [];
    const unknownWpn = ExportHelpers.i18n("RMU_EXPORT.Common.UnknownWeapon", "Unknown Weapon");
    const unknownTxt = ExportHelpers.i18n("RMU_EXPORT.Common.Unknown", "Unknown");

    return attacks.map((a) => {
        let rangeDisplay = "";

        if (a.isRanged) {
            let rawRangeVal = a.usage?.range?.short;
            let rawRangeStr = a.usage?.range?._shortRange;

            // Prioritise the derived string (_shortRange) as it contains the actor's modifiers
            if (rawRangeStr) {
                const cleanRange = String(rawRangeStr).replaceAll(/['"a-zA-Z\s]/g, "");

                if (ExportHelpers.isMetric) {
                    if (String(rawRangeStr).includes("m")) {
                        rangeDisplay = `<${cleanRange} m>`;
                    } else if (Number.isNaN(Number.parseFloat(cleanRange))) {
                        rangeDisplay = `<${cleanRange}>`;
                    } else {
                        rangeDisplay = `<${ExportHelpers.toMetricRange(Number.parseFloat(cleanRange))}>`;
                    }
                } else {
                    rangeDisplay = `<${cleanRange}>`;
                }
            }
            // Fallback to the raw base number (short) if the derived string is missing
            else if (rawRangeVal !== undefined && rawRangeVal !== null) {
                rangeDisplay = ExportHelpers.isMetric ? `<${ExportHelpers.toMetricRange(rawRangeVal)}>` : `<${rawRangeVal}'>`;
            }
        }

        let reachDisplay = "";
        if (!rangeDisplay && a.meleeRange) {
            reachDisplay = ExportHelpers.isMetric ? ExportHelpers.toMetricReach(a.meleeRange) : `${Math.round(Number(a.meleeRange) * 100) / 100}'`;
        }

        let attackName = a.attackName || unknownWpn;
        if (game.i18n.has(`RMU.AttackTables.${a.attackName}`)) {
            attackName = game.i18n.localize(`RMU.AttackTables.${a.attackName}`);
        } else if (game.i18n.has(`RMU.Attacks.${a.attackName}`)) {
            attackName = game.i18n.localize(`RMU.Attacks.${a.attackName}`);
        }

        // Refactored: Eliminated useless assignment and the 'else' block by setting the default first
        let chartName = unknownTxt;
        if (a.chart?.name) {
            chartName = game.i18n.has(`RMU.AttackTables.${a.chart.name}`) ? game.i18n.localize(`RMU.AttackTables.${a.chart.name}`) : a.chart.name;
        }

        // Refactored: Flattened the nested ternary by applying the default fallback immediately
        let specialization = unknownTxt;
        if (a.specialization) {
            specialization = game.i18n.has(`RMU.Specializations.${a.specialization}`) ? game.i18n.localize(`RMU.Specializations.${a.specialization}`) : a.specialization;
        }

        let strength = a.itemStrength ?? a.weapon?.strength ?? "—";
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
