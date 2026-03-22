export function extractConditions(actor) {
    const sys = actor.system;
    const rawEffects = sys._injuryBlock?._effects || actor.effects || [];
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
        const type = effectSys.type;

        if (effectSys.penalty) {
            if (type === "injury") conditions.totalInjuryPenalty += Number(effectSys.penalty);
            if (type === "fatigue") conditions.totalFatiguePenalty += Number(effectSys.penalty);
            if (type === "stun") conditions.totalStunPenalty += Number(effectSys.penalty);
        }

        if (type === "injury") {
            let severity = effectSys.penalty ? `${effectSys.penalty}` : "";
            if (effectSys.value && effectSys.effect === "Bleed") severity = `${effectSys.value}/rd`;

            conditions.injuries.push({
                effect: effectSys.effect || "Injury",
                location: effectSys.location?.locationLabel || "Unknown",
                severity: severity,
                description: effectSys.description || "",
            });
        } else if (type === "stun") {
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
        } else if (type === "power" || (type === "base" && !["fatigue", "prone", "injury", "stun"].includes(effectSys.effect?.toLowerCase()))) {
            conditions.activeEffects.push({
                name: e.name || "Unknown Effect",
                bonus: effectSys.summary?.bonus || "—",
                duration: e.duration?.rounds ? `${e.duration.rounds} rds` : "—",
                description: effectSys.summary?.sub1Label ? game.i18n.localize(effectSys.summary.sub1Label) : "—",
            });
        }
    });

    return conditions;
}
