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
                if (ExportHelpers.isMetric) {
                    rangeDisplay = `<${ExportHelpers.toMetricRange(rawRangeVal)}>`;
                } else {
                    rangeDisplay = `<${rawRangeVal}'>`;
                }
            } else {
                let rawRangeStr = a.usage?.range?._shortRange;
                if (rawRangeStr) {
                    const cleanRange = String(rawRangeStr).replace(/['"a-zA-Z\s]/g, "");
                    if (ExportHelpers.isMetric) {
                        if (String(rawRangeStr).includes("m")) {
                            rangeDisplay = `<${cleanRange} m>`;
                        } else {
                            const numeric = parseFloat(cleanRange);
                            if (!isNaN(numeric)) {
                                rangeDisplay = `<${ExportHelpers.toMetricRange(numeric)}>`;
                            } else {
                                rangeDisplay = `<${cleanRange}>`;
                            }
                        }
                    } else {
                        rangeDisplay = `<${cleanRange}>`;
                    }
                }
            }
        }

        let reachDisplay = "";
        if (!rangeDisplay && a.meleeRange) {
            if (ExportHelpers.isMetric) {
                reachDisplay = ExportHelpers.toMetricReach(a.meleeRange);
            } else {
                const roundedReach = Math.round(Number(a.meleeRange) * 100) / 100;
                reachDisplay = `${roundedReach}'`;
            }
        }

        let attackName = a.attackName || unknownWpn;
        const tableKey = `RMU.AttackTables.${a.attackName}`;
        const attackKey = `RMU.Attacks.${a.attackName}`;

        if (game.i18n.has(tableKey)) {
            attackName = game.i18n.localize(tableKey);
        } else if (game.i18n.has(attackKey)) {
            attackName = game.i18n.localize(attackKey);
        }

        let chartName = a.chart.name || unknownTxt;
        const chartKey = `RMU.AttackTables.${a.chart.name}`;
        if (game.i18n.has(chartKey)) {
            chartName = game.i18n.localize(chartKey);
        }

        let specialization = a.specialization || unknownTxt;
        if (a.specialization) {
            const specKey = `RMU.Specializations.${a.specialization}`;
            if (game.i18n.has(specKey)) {
                specialization = game.i18n.localize(specKey);
            }
        }

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
            strength: a.itemStrength ?? "",
            breakage_dmg: a.damagePenalty ?? 0,
        };
    });
}
