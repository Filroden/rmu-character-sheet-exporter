/**
 * Extracts the Training Packages owned by an actor.
 *
 * Training packages are embedded items of type "training-package". The export only needs
 * enough information to validate the character: the package name, the skill specialisation
 * chosen for the free rank, and whether the package has been completed.
 */

const TRAINING_PACKAGE_TYPE = "training-package";

// The system stores the chosen skill grant as "Category|Skill|Specialization".
const SKILL_GRANT_SEPARATOR = "|";

/**
 * Localises a value using a system key prefix, falling back to the raw value.
 * @param {string} prefix - The system localisation prefix (e.g. "RMU.Skills").
 * @param {string} value - The raw value to localise.
 * @returns {string} The localised value, or the raw value if no key exists.
 */
function localizeWithPrefix(prefix, value) {
    if (!value) return "";
    const key = `${prefix}.${value}`;
    return game.i18n.has(key) ? game.i18n.localize(key) : value;
}

/**
 * Converts the stored skill grant choice into a display label that matches the format used
 * in the Skills section ("Skill: Specialisation").
 * The category is deliberately omitted because the skill name is already unambiguous on a sheet.
 * @param {string} choice - The raw "Category|Skill|Specialization" string.
 * @returns {string} The localised display label, or an empty string if no choice was made.
 */
function formatSkillGrant(choice) {
    if (!choice || typeof choice !== "string") return "";

    const [, skill = "", specialization = ""] = choice.split(SKILL_GRANT_SEPARATOR);
    const skillLabel = localizeWithPrefix("RMU.Skills", skill);
    const specLabel = localizeWithPrefix("RMU.Specializations", specialization);

    if (!specLabel) return skillLabel;
    if (!skillLabel) return specLabel;
    return `${skillLabel}: ${specLabel}`;
}

/**
 * Builds the export entry for a single training package item.
 * Any value other than a truthy trainingComplete flag is treated as "in progress", so a
 * package that has been added but not finished is still listed for validation purposes.
 * @param {Item} item - The training package item.
 * @returns {{name: string, skillGrant: string, inProgress: boolean}}
 */
function buildTrainingPackageEntry(item) {
    const system = item.system ?? {};
    return {
        name: game.i18n.localize(item.name),
        skillGrant: formatSkillGrant(system.skillGrantChoice),
        inProgress: !system.trainingComplete,
    };
}

/**
 * Extracts all training packages on the actor, sorted alphabetically by name.
 * @param {Actor} actor - The actor being exported.
 * @returns {Array<{name: string, skillGrant: string, inProgress: boolean}>}
 */
export function extractTrainingPackages(actor) {
    const items = actor?.items;
    if (!items) return [];

    return items
        .filter((item) => item.type === TRAINING_PACKAGE_TYPE)
        .map(buildTrainingPackageEntry)
        .sort((a, b) => a.name.localeCompare(b.name));
}
