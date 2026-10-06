/**
 * Export configuration: the available layouts, themes and sheet sections, plus the helpers
 * that turn a user's dialog choices into extractor options and a layout template path.
 *
 * The export dialog (for its live preview) and the final download both use these helpers, so
 * the preview always matches the file that is saved.
 */

export const MODULE_ID = "rmu-character-sheet-exporter";

const MODULE_PATH = `modules/${MODULE_ID}`;

// Version of the embedded actor data block ("character capsule") written into exported HTML.
// Raise this only when the shape of that block changes in a way older importers cannot read;
// importers refuse files whose format number is higher than the one they support.
export const CAPSULE_FORMAT = 1;

// Only these actor types show the Export and Import controls.
export const VALID_ACTOR_TYPES = new Set(["Character", "Creature", "Loot"]);

// Layout files are named "<layout>_<actor type>_layout.hbs"; the configured path holds the
// type-neutral name and resolveLayoutPath inserts the actor type.
const LAYOUT_SUFFIX = "_layout.hbs";

// Value of the skill filter select that shows every skill rather than ranked/favourites only.
const SHOW_ALL_SKILLS = "all";

export const EXPORT_CONFIG = {
    layouts: {
        standard: {
            id: "standard",
            label: "RMU_EXPORT.Layouts.Standard",
            path: `${MODULE_PATH}/templates/layouts/standard${LAYOUT_SUFFIX}`,
        },
        compact: {
            id: "compact",
            label: "RMU_EXPORT.Layouts.Compact",
            path: `${MODULE_PATH}/templates/layouts/compact${LAYOUT_SUFFIX}`,
        },
        extended: {
            id: "extended",
            label: "RMU_EXPORT.Layouts.Extended",
            path: `${MODULE_PATH}/templates/layouts/extended${LAYOUT_SUFFIX}`,
        },
        tournament: {
            id: "tournament",
            label: "RMU_EXPORT.Layouts.Tournament",
            path: `${MODULE_PATH}/templates/layouts/tournament${LAYOUT_SUFFIX}`,
        },
    },

    themes: {
        standard: {
            id: "standard",
            label: "RMU_EXPORT.Themes.Standard",
            path: `${MODULE_PATH}/styles/themes/standard.css`,
        },
        dark: {
            id: "dark",
            label: "RMU_EXPORT.Themes.DarkMode",
            path: `${MODULE_PATH}/styles/themes/dark.css`,
        },
        rulebook: {
            id: "rulebook",
            label: "RMU_EXPORT.Themes.Rulebook",
            path: `${MODULE_PATH}/styles/themes/rulebook.css`,
        },
        boba: {
            id: "boba",
            label: "RMU_EXPORT.Themes.Boba",
            path: `${MODULE_PATH}/styles/themes/boba.css`,
        },
        print: {
            id: "print",
            label: "RMU_EXPORT.Themes.PrintHighContrast",
            path: `${MODULE_PATH}/styles/themes/print.css`,
        },
    },

    // Structural rules shared by every theme (column widths, write-in rows and similar). The
    // output generator loads this before the chosen theme so a theme can still override it.
    baseStylesPath: `${MODULE_PATH}/styles/export-base.css`,

    sections: {
        header: { label: "RMU_EXPORT.Section.Header", default: true, validTypes: ["Character", "Creature", "Loot"] },
        quick_info: { label: "RMU_EXPORT.Section.QuickInfo", default: true, validTypes: ["Character", "Creature"] },
        movement: { label: "RMU_EXPORT.Section.Movement", default: true, validTypes: ["Character", "Creature"] },
        stats: { label: "RMU_EXPORT.Section.Stats", default: true, validTypes: ["Character", "Creature"] },
        portrait: { label: "RMU_EXPORT.Section.Portrait", default: true, validTypes: ["Character", "Creature", "Loot"] },
        details: { label: "RMU_EXPORT.Section.Details", default: true, validTypes: ["Character", "Creature", "Loot"] },
        biography: { label: "RMU_EXPORT.Section.Biography", default: false, validTypes: ["Character", "Creature", "Loot"] },
        conditions: { label: "RMU_EXPORT.Section.Conditions", default: false, validTypes: ["Character", "Creature"] },
        defenses: { label: "RMU_EXPORT.Section.Defenses", default: true, validTypes: ["Character", "Creature"] },
        attacks: { label: "RMU_EXPORT.Section.Attacks", default: true, validTypes: ["Character", "Creature"] },
        skills: { label: "RMU_EXPORT.Section.Skills", default: true, validTypes: ["Character", "Creature"] },
        training_packages: { label: "RMU_EXPORT.Section.TrainingPackages", default: true, validTypes: ["Character"] },
        fighting_styles: { label: "RMU_EXPORT.Section.FightingStyles", default: true, validTypes: ["Character"] },
        spells: { label: "RMU_EXPORT.Section.SpellLists", default: true, validTypes: ["Character", "Creature"] },
        inventory: { label: "RMU_EXPORT.Section.Inventory", default: true, validTypes: ["Character", "Creature", "Loot"] },
        talents: { label: "RMU_EXPORT.Section.Talents", default: true, validTypes: ["Character", "Creature"] },
    },
};

/**
 * Returns true if a section applies to the given actor type.
 * A section without a validTypes list applies to every type.
 * @param {Object} sectionConfig - One entry from EXPORT_CONFIG.sections.
 * @param {string} actorType - The actor's type.
 * @returns {boolean}
 */
export function isSectionValidForType(sectionConfig, actorType) {
    return !sectionConfig.validTypes || sectionConfig.validTypes.includes(actorType);
}

/**
 * Builds the options object passed to DataExtractor.getCleanData.
 * Sections that do not apply to the actor type are always forced off, so an extractor is
 * never run for data the actor cannot have (e.g. stats on a Loot actor).
 * @param {string} actorType - The actor's type.
 * @param {(key: string) => boolean} isChecked - Reports whether a section's checkbox is ticked.
 * @param {string} skillFilter - The value of the skill filter select.
 * @returns {Object}
 */
export function buildSectionOptions(actorType, isChecked, skillFilter) {
    const options = {};
    for (const [key, sectionConfig] of Object.entries(EXPORT_CONFIG.sections)) {
        options[key] = isSectionValidForType(sectionConfig, actorType) && Boolean(isChecked(key));
    }
    options.showAllSkills = skillFilter === SHOW_ALL_SKILLS;
    return options;
}

/**
 * Returns the template path for a layout and actor type
 * (e.g. "standard" + "Creature" gives ".../standard_creature_layout.hbs").
 * @param {string} layoutId - A key of EXPORT_CONFIG.layouts.
 * @param {string} actorType - The actor's type.
 * @returns {string|null} The path, or null if the layout is unknown.
 */
export function resolveLayoutPath(layoutId, actorType) {
    const basePath = EXPORT_CONFIG.layouts[layoutId]?.path;
    if (!basePath) return null;
    return basePath.replace(LAYOUT_SUFFIX, `_${actorType.toLowerCase()}${LAYOUT_SUFFIX}`);
}

/**
 * Returns the stylesheet path for a theme.
 * @param {string} themeId - A key of EXPORT_CONFIG.themes.
 * @returns {string|null} The path, or null if the theme is unknown.
 */
export function resolveThemePath(themeId) {
    return EXPORT_CONFIG.themes[themeId]?.path ?? null;
}
