import { ExportHelpers } from "../utils/ExportHelpers.js";

export function extractConditions(actor) {
    const sys = actor.system;

    // Priority 1: actor.appliedEffects (Foundry standard for ALL active + transferred effects)
    // Priority 2: sys._injuryBlock._effects (System specific fallback)
    const rawEffects = actor.appliedEffects || sys._injuryBlock?._effects || [];
    const effectsList = rawEffects.map ? Array.from(rawEffects.map((e) => e.value || e)) : Array.from(rawEffects);

    const conditions = {
        hitLossPenalty: sys._injuryBlock?._hitLossPenalty || 0,
        totalFatiguePenalty: 0,
        totalInjuryPenalty: 0,
        totalStunPenalty: 0,
        injuries: [],
        stun: null,
        activeEffects: [],
    };

    effectsList.forEach((e) => {
        const effectSys = e.system || {};

        // RMU properties can be located at system.type OR system.summary.type depending on the effect origin
        const rmuType = effectSys.type || effectSys.summary?.type;

        // 1. Calculate running penalty totals
        if (effectSys.penalty) {
            if (rmuType === "injury") conditions.totalInjuryPenalty += Number(effectSys.penalty);
            if (rmuType === "fatigue") conditions.totalFatiguePenalty += Number(effectSys.penalty);
            if (rmuType === "stun") conditions.totalStunPenalty += Number(effectSys.penalty);
        }

        // 2. Categorize the effects
        if (rmuType === "injury") {
            let severity = effectSys.penalty ? `${effectSys.penalty}` : "";
            if (effectSys.value && effectSys.effect === "Bleed") severity = `${effectSys.value}/rd`;

            conditions.injuries.push({
                effect: effectSys.effect || "Injury",
                location: effectSys.location?.locationLabel || "Unknown",
                severity: severity,
                description: effectSys.description || "",
            });
        } else if (rmuType === "stun") {
            const roundsArr = effectSys.rounds || [];
            const stunDetails = [];
            const labels = ["-25", "-50", "-75"];

            for (let i = 2; i >= 0; i--) {
                if (roundsArr[i] > 0) {
                    stunDetails.push({ stunLabel: labels[i], stunRounds: roundsArr[i] });
                }
            }
            const totalRounds = roundsArr.reduce((a, b) => a + b, 0);

            if (totalRounds > 0) {
                conditions.stun = { totalRounds: totalRounds, details: stunDetails };
            }
        } else if (rmuType === "fatigue") {
            // Already summed up in the penalty values, no table row needed
        } else {
            // CATCH-ALL: Active Effects, Buffs, and Statuses (like Prone or Power Multipliers)
            let bonus = effectSys.summary?.bonus || "—";
            let description = "—";

            // Localize the summary label if it exists, otherwise fallback to the raw description
            if (effectSys.summary?.sub1Label) {
                description = ExportHelpers.i18n(effectSys.summary.sub1Label);
            } else if (effectSys.description) {
                description = effectSys.description;
            }

            // If it's a generic Foundry effect with no RMU summary, try to extract the mod count
            if (bonus === "—" && e.changes?.length > 0) {
                bonus = `${e.changes.length} Mods`;
            }

            // Prevent blank/corrupted entities from breaking the table
            if (e.name) {
                conditions.activeEffects.push({
                    name: e.name,
                    bonus: bonus,
                    duration: e.duration?.rounds ? `${e.duration.rounds} rds` : "—",
                    description: description,
                });
            }
        }
    });

    return conditions;
}
