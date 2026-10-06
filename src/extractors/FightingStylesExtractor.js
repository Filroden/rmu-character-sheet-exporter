import { ExportHelpers } from "../utils/ExportHelpers.js";

/**
 * Extracts Fighting Styles and their chosen abilities.
 *
 * A fighting style is spread across three kinds of embedded item, all linked by the id of the
 * style's skill item:
 *   - a "skill" item (e.g. "Combat Styles" with the specialisation "Sword Master") that holds
 *     the ranks purchased in the style;
 *   - a "fighting-style" item whose system.fightingStyleId points at that skill item;
 *   - one "fighting-ability" item per ability the player has added, each with
 *     system.fightingStyleId pointing at the same skill item and system.ranks holding the
 *     ranks allocated to it so far.
 *
 * Ranks allocated to an ability can never be moved, so the export shows each ability's
 * progress and any ranks in the style that have not yet been allocated.
 */

const STYLE_ITEM_TYPE = "fighting-style";
const ABILITY_ITEM_TYPE = "fighting-ability";

// A maxTier of -1 marks an ability that may be selected multiple times (shown with an
// asterisk against its cost in the rulebook). Repeat selections accumulate ranks on the same
// item rather than creating a second item.
const REPEATABLE_MAX_TIER = -1;
const REPEATABLE_MARKER = "*";
const TIMES_TAKEN_MARKER = "×";

const STATUS = Object.freeze({
    COMPLETE: "complete",
    PARTIAL: "partial",
    NOT_STARTED: "notStarted",
});

// Display order of abilities within a style: finished first, then in progress, then planned.
const STATUS_ORDER = Object.freeze({
    [STATUS.COMPLETE]: 0,
    [STATUS.PARTIAL]: 1,
    [STATUS.NOT_STARTED]: 2,
});

const STATUS_LABEL_KEYS = Object.freeze({
    [STATUS.COMPLETE]: "RMU_EXPORT.FightingStyles.Complete",
    [STATUS.PARTIAL]: "RMU_EXPORT.FightingStyles.Partial",
    [STATUS.NOT_STARTED]: "RMU_EXPORT.FightingStyles.NotStarted",
});

/* -------------------------------------------- */
/* Generic helpers                              */
/* -------------------------------------------- */

/**
 * Converts a value to a non-negative integer, treating anything invalid as zero.
 * @param {*} value - The raw value.
 * @returns {number}
 */
function toRankCount(value) {
    const num = Number.parseInt(value, 10);
    return Number.isFinite(num) && num > 0 ? num : 0;
}

/* -------------------------------------------- */
/* Ability progress                             */
/* -------------------------------------------- */

/**
 * Splits a single-pick ability's ranks into a completed selection or partial ranks.
 * @param {number} ranks - Ranks allocated to the ability.
 * @param {number} cost - Rank cost of the ability.
 * @returns {{timesTaken: number, partialRanks: number}}
 */
function splitSinglePickRanks(ranks, cost) {
    if (ranks >= cost) return { timesTaken: 1, partialRanks: 0 };
    return { timesTaken: 0, partialRanks: ranks };
}

/**
 * Works out how far an ability has progressed from its allocated ranks.
 * Repeatable abilities can be completed several times, with any remainder counting towards
 * the next selection. Single-pick abilities are complete once their full cost is allocated.
 * An ability is "partial" whenever ranks are sitting towards a selection that is not yet
 * finished, so a repeatable ability taken twice with ranks towards a third is still partial.
 * @param {number} ranks - Ranks allocated to the ability.
 * @param {number} cost - Rank cost of one selection of the ability.
 * @param {boolean} repeatable - Whether the ability may be selected multiple times.
 * @returns {{timesTaken: number, partialRanks: number, status: string}}
 */
function calculateAbilityProgress(ranks, cost, repeatable) {
    if (ranks === 0) {
        return { timesTaken: 0, partialRanks: 0, status: STATUS.NOT_STARTED };
    }

    // Guard against a missing or zero cost, which would otherwise cause a division by zero.
    if (cost === 0) {
        return { timesTaken: 1, partialRanks: 0, status: STATUS.COMPLETE };
    }

    const { timesTaken, partialRanks } = repeatable
        ? { timesTaken: Math.floor(ranks / cost), partialRanks: ranks % cost }
        : splitSinglePickRanks(ranks, cost);
    const status = partialRanks > 0 ? STATUS.PARTIAL : STATUS.COMPLETE;

    return { timesTaken, partialRanks, status };
}

/**
 * Builds the progress label shown on the right of an ability row.
 * Single-pick abilities show all their allocated ranks against the cost ("2/6", "6/6").
 * Repeatable abilities show only the ranks towards the next selection ("1/4"), because
 * completed selections are already shown by the times-taken label beside the name.
 * @param {number} ranks - Ranks allocated to the ability.
 * @param {number} cost - Rank cost of one selection.
 * @param {boolean} repeatable - Whether the ability may be selected multiple times.
 * @param {{partialRanks: number}} progress - Result of calculateAbilityProgress.
 * @returns {string}
 */
function formatAbilityProgress(ranks, cost, repeatable, progress) {
    const shownRanks = repeatable ? progress.partialRanks : ranks;
    return `${shownRanks}/${cost}`;
}

/**
 * Builds the times-taken label shown beside a repeatable ability's name (e.g. "×2").
 * Single-pick abilities, and repeatable abilities not yet completed once, have no label.
 * @param {boolean} repeatable - Whether the ability may be selected multiple times.
 * @param {{timesTaken: number}} progress - Result of calculateAbilityProgress.
 * @returns {string}
 */
function formatTimesTaken(repeatable, progress) {
    if (!repeatable || progress.timesTaken === 0) return "";
    return `${TIMES_TAKEN_MARKER}${progress.timesTaken}`;
}

/**
 * Builds the export entry for a single fighting ability item.
 * @param {Item} item - The fighting ability item.
 * @returns {Object} The ability entry used by the templates.
 */
function buildAbilityEntry(item) {
    const system = item.system ?? {};
    const ranks = toRankCount(system.ranks);
    const cost = toRankCount(system.rankCost);
    const repeatable = system.maxTier === REPEATABLE_MAX_TIER;
    const progress = calculateAbilityProgress(ranks, cost, repeatable);

    return {
        name: game.i18n.localize(system.label || item.name),
        ranks,
        cost: `${cost}${repeatable ? REPEATABLE_MARKER : ""}`,
        repeatable,
        timesTaken: progress.timesTaken,
        partialRanks: progress.partialRanks,
        status: progress.status,
        statusLabel: game.i18n.localize(STATUS_LABEL_KEYS[progress.status]),
        progress: formatAbilityProgress(ranks, cost, repeatable, progress),
        timesTakenLabel: formatTimesTaken(repeatable, progress),
        isComplete: progress.status === STATUS.COMPLETE,
        isPartial: progress.status === STATUS.PARTIAL,
        isNotStarted: progress.status === STATUS.NOT_STARTED,
    };
}

/**
 * Sorts abilities by status (complete, partial, not started) and then by name.
 * @param {Object} a - First ability entry.
 * @param {Object} b - Second ability entry.
 * @returns {number}
 */
function compareAbilities(a, b) {
    const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    return byStatus === 0 ? a.name.localeCompare(b.name) : byStatus;
}

/* -------------------------------------------- */
/* Style skill lookup                           */
/* -------------------------------------------- */

/**
 * Returns a flat list of the derived skill entries prepared by the system.
 * These entries carry calculated values (such as _totalRanks, which includes culture and
 * training package ranks) that are not stored on the skill item itself.
 * @param {Actor} actor - The actor being exported.
 * @returns {Array<Object>}
 */
function getDerivedSkills(actor) {
    const groups = actor.system?._skillGroups;
    if (!Array.isArray(groups)) return [];
    return groups.flatMap((group) => (Array.isArray(group.skills) ? group.skills : []));
}

/**
 * Finds the derived skill entry for a style's skill item.
 * @param {Array<Object>} derivedSkills - Result of getDerivedSkills.
 * @param {string} skillId - The id of the style's skill item.
 * @returns {Object|null}
 */
function findDerivedSkill(derivedSkills, skillId) {
    return derivedSkills.find((skill) => skill._embeddedId === skillId || skill._id === skillId) ?? null;
}

/**
 * Returns the total ranks in a style's skill.
 * The derived total is preferred because it includes every source of ranks. If the system
 * has not prepared derived data, the stored purchased and culture ranks are used instead.
 * @param {Object|null} derivedSkill - The derived skill entry, if available.
 * @param {Item|undefined} skillItem - The style's skill item, if available.
 * @returns {number}
 */
function getStyleTotalRanks(derivedSkill, skillItem) {
    if (derivedSkill && derivedSkill._totalRanks !== undefined) {
        return toRankCount(derivedSkill._totalRanks);
    }
    const system = skillItem?.system ?? {};
    return toRankCount(system.ranks) + toRankCount(system.cultureRanks);
}

/* -------------------------------------------- */
/* Style assembly                               */
/* -------------------------------------------- */

/**
 * Groups the actor's fighting style and fighting ability items by the id of their skill item.
 * @param {Actor} actor - The actor being exported.
 * @returns {Map<string, {style: Item|null, abilities: Item[]}>}
 */
function groupStyleItems(actor) {
    const groups = new Map();

    const getGroup = (skillId) => {
        if (!groups.has(skillId)) groups.set(skillId, { style: null, abilities: [] });
        return groups.get(skillId);
    };

    for (const item of actor.items) {
        const skillId = item.system?.fightingStyleId;
        if (!skillId) continue;

        if (item.type === STYLE_ITEM_TYPE) getGroup(skillId).style = item;
        else if (item.type === ABILITY_ITEM_TYPE) getGroup(skillId).abilities.push(item);
    }

    return groups;
}

/**
 * Adds any ranked fighting style skills that have no style or ability items yet, so ranks
 * bought in a style are never missing from the export.
 * @param {Map} groups - Result of groupStyleItems (modified in place).
 * @param {Array<Object>} derivedSkills - Result of getDerivedSkills.
 */
function addRankedStylesWithoutItems(groups, derivedSkills) {
    for (const skill of derivedSkills) {
        const skillId = skill._embeddedId ?? skill._id;
        const isRankedStyle = skill._isFightingStyle && toRankCount(skill._totalRanks) > 0;
        if (!skillId || !isRankedStyle || groups.has(skillId)) continue;
        groups.set(skillId, { style: null, abilities: [] });
    }
}

/**
 * Builds the export entry for one fighting style.
 * @param {string} skillId - The id of the style's skill item.
 * @param {{style: Item|null, abilities: Item[]}} group - The style's linked items.
 * @param {Actor} actor - The actor being exported.
 * @param {Array<Object>} derivedSkills - Result of getDerivedSkills.
 * @returns {Object} The style entry used by the templates.
 */
function buildStyleEntry(skillId, group, actor, derivedSkills) {
    const skillItem = actor.items.get(skillId);
    const derivedSkill = findDerivedSkill(derivedSkills, skillId);
    const skillData = derivedSkill ?? skillItem?.system ?? {};

    const abilities = group.abilities.map(buildAbilityEntry).sort(compareAbilities);
    const totalRanks = getStyleTotalRanks(derivedSkill, skillItem);
    const allocatedRanks = abilities.reduce((sum, ability) => sum + ability.ranks, 0);

    const rawName = group.style?.name || skillData.specialization || skillData.name || "";

    return {
        name: ExportHelpers.localizeWithPrefix("RMU.Specializations", rawName),
        skill: ExportHelpers.localizeWithPrefix("RMU.Skills", skillData.name),
        category: ExportHelpers.localizeWithPrefix("RMU.SkillCategory", skillData.category),
        styleType: group.style?.system?.styleType ?? "",
        totalRanks,
        allocatedRanks,
        // The system prevents over-allocation; the clamp only guards against stale derived data.
        unallocatedRanks: Math.max(0, totalRanks - allocatedRanks),
        // Used by the detailed layouts to decide whether to show the repeatable (*) footnote.
        hasRepeatable: abilities.some((ability) => ability.repeatable),
        abilities,
    };
}

/**
 * Extracts all fighting styles on the actor, sorted alphabetically by style name.
 * @param {Actor} actor - The actor being exported.
 * @returns {Array<Object>}
 */
export function extractFightingStyles(actor) {
    if (!actor?.items) return [];

    const derivedSkills = getDerivedSkills(actor);
    const groups = groupStyleItems(actor);
    addRankedStylesWithoutItems(groups, derivedSkills);

    return Array.from(groups, ([skillId, group]) => buildStyleEntry(skillId, group, actor, derivedSkills)).sort((a, b) =>
        a.name.localeCompare(b.name),
    );
}
