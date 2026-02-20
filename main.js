import { DataExtractor } from "./src/DataExtractor.js";
import { OutputGenerator } from "./src/OutputGenerator.js";
import { ExportDialog } from "./src/ExportDialog.js";
import { ImportHandler } from "./src/ImportHandler.js";

const MODULE_ID = "rmu-character-sheet-exporter";

// --- CONFIGURATION: VALID ACTOR TYPES ---
// Only these types will show the Export/Import buttons.
const VALID_ACTOR_TYPES = ["Character", "Creature", "Loot"];

const RMU_EXPORT_CONFIG = {
    layouts: {
        standard: {
            id: "standard",
            label: "RMU_EXPORT.Layouts.Standard",
            path: "modules/rmu-character-sheet-exporter/templates/layouts/standard_layout.hbs",
        },
        compact: {
            id: "compact",
            label: "RMU_EXPORT.Layouts.Compact",
            path: "modules/rmu-character-sheet-exporter/templates/layouts/compact_layout.hbs",
        },
    },

    themes: {
        standard: {
            id: "standard",
            label: "RMU_EXPORT.Themes.Standard",
            path: "modules/rmu-character-sheet-exporter/styles/themes/standard.css",
        },
        dark: {
            id: "dark",
            label: "RMU_EXPORT.Themes.DarkMode",
            path: "modules/rmu-character-sheet-exporter/styles/themes/dark.css",
        },
        boba: {
            id: "boba",
            label: "RMU_EXPORT.Themes.Boba",
            path: "modules/rmu-character-sheet-exporter/styles/themes/boba.css",
        },
        print: {
            id: "print",
            label: "RMU_EXPORT.Themes.PrintHighContrast",
            path: "modules/rmu-character-sheet-exporter/styles/themes/print.css",
        },
    },

    sections: {
        header: {
            label: "RMU_EXPORT.Section.Header",
            default: true,
            validTypes: ["Character", "Creature", "Loot"],
        },
        quick_info: {
            label: "RMU_EXPORT.Section.QuickInfo",
            default: true,
            validTypes: ["Character", "Creature"],
        },
        movement: {
            label: "RMU_EXPORT.Section.Movement",
            default: true,
            validTypes: ["Character", "Creature"],
        },
        stats: {
            label: "RMU_EXPORT.Section.Stats",
            default: true,
            validTypes: ["Character", "Creature"],
        },
        portrait: {
            label: "RMU_EXPORT.Section.Portrait",
            default: true,
            validTypes: ["Character", "Creature", "Loot"],
        },
        details: {
            label: "RMU_EXPORT.Section.Details",
            default: true,
            validTypes: ["Character", "Creature", "Loot"],
        },
        biography: {
            label: "RMU_EXPORT.Section.Biography",
            default: false,
            validTypes: ["Character", "Creature", "Loot"],
        },
        defenses: {
            label: "RMU_EXPORT.Section.Defenses",
            default: true,
            validTypes: ["Character", "Creature"],
        },
        attacks: {
            label: "RMU_EXPORT.Section.Attacks",
            default: true,
            validTypes: ["Character", "Creature"],
        },
        skills: {
            label: "RMU_EXPORT.Section.Skills",
            default: true,
            validTypes: ["Character", "Creature"],
        },
        spells: {
            label: "RMU_EXPORT.Section.SpellLists",
            default: true,
            validTypes: ["Character", "Creature"],
        },
        inventory: {
            label: "RMU_EXPORT.Section.Inventory",
            default: true,
            validTypes: ["Character", "Creature", "Loot"],
        },
        talents: {
            label: "RMU_EXPORT.Section.Talents",
            default: true,
            validTypes: ["Character", "Creature"],
        },
    },
};

Hooks.once("init", () => {
    console.log(`${MODULE_ID} | Initializing RMU Character Sheet Export`);
});

/* -------------------------------------------- */
/* Application V1 Header Buttons                */
/* -------------------------------------------- */

const addHeaderButton = (app, buttons) => {
    const actor = app.document || app.object || app.actor;
    if (!actor) return;

    if (!VALID_ACTOR_TYPES.includes(actor.type)) return;

    const exist = buttons.some((b) => b.class === "rmu-export-btn");
    if (exist) return;

    buttons.unshift({
        label: game.i18n.localize("RMU_EXPORT.Button.ExportSheet"),
        class: "rmu-export-btn",
        icon: "rmu-cse-icon export",
        onclick: () => startExportProcess(actor),
    });
};

Hooks.on("getActorSheetHeaderButtons", addHeaderButton);
Hooks.on("getApplicationHeaderButtons", addHeaderButton);

/* -------------------------------------------- */
/* Application V2 Header Controls               */
/* -------------------------------------------- */

const addAppV2Control = (app, controls) => {
    const actor = app.document || app.object || app.actor;
    if (!actor) return;

    if (!VALID_ACTOR_TYPES.includes(actor.type)) return;

    const ACTION_NAME = "rmuExportSheet";

    controls.push({
        action: ACTION_NAME,
        label: game.i18n.localize("RMU_EXPORT.Button.ExportSheet"),
        icon: "rmu-cse-icon export",
        class: "rmu-export-btn",
        onClick: () => startExportProcess(actor),
    });
};

Hooks.on("getHeaderControlsActorSheetV2", addAppV2Control);
Hooks.on("getActorSheetV2HeaderControls", addAppV2Control);

/* -------------------------------------------- */
/* Core Export Logic                            */
/* -------------------------------------------- */

async function startExportProcess(actor) {
    if (!actor) return;

    const hasActiveToken =
        actor.isToken ||
        (actor.getActiveTokens && actor.getActiveTokens().length > 0);

    if (!hasActiveToken) {
        ui.notifications.warn(
            game.i18n.localize("RMU_EXPORT.Notify.TokenRequired"),
        );
        return;
    }

    try {
        const derivedActor = await DataExtractor.ensureExtendedData(actor);

        if (!derivedActor) {
            console.warn(
                `${MODULE_ID} | Data initialization failed completely.`,
            );
        }

        const result = await ExportDialog.wait(
            derivedActor || actor,
            RMU_EXPORT_CONFIG,
        );

        if (result) {
            await handleExportSubmit(result, derivedActor || actor);
        }
    } catch (error) {
        console.error(`${MODULE_ID} | Export Failed:`, error);
        ui.notifications.error(
            game.i18n.format("RMU_EXPORT.Notify.Failed", {
                msg: error.message,
            }),
        );
    }
}

async function handleExportSubmit(formData, actor) {
    const layoutId = formData.layout;
    const themeId = formData.theme;
    const sectionOptions = {};

    // SCALABLE FILTERING: Force 'false' if the actor type isn't allowed for this section
    Object.keys(RMU_EXPORT_CONFIG.sections).forEach((key) => {
        const validTypes = RMU_EXPORT_CONFIG.sections[key].validTypes;
        const isTypeValid = validTypes ? validTypes.includes(actor.type) : true;

        sectionOptions[key] = isTypeValid ? formData[key] : false;
    });

    const skillFilter = formData.skillFilter || "ranked";
    sectionOptions.showAllSkills = skillFilter === "all";

    // DataExtractor receives pre-filtered options. It won't even try to fetch Stats for Loot.
    const cleanData = await DataExtractor.getCleanData(actor, sectionOptions);

    const themePath = RMU_EXPORT_CONFIG.themes[themeId].path;
    let rawLayoutPath = RMU_EXPORT_CONFIG.layouts[layoutId].path;
    const typeSuffix = actor.type.toLowerCase();
    const layoutPath = rawLayoutPath.replace(
        "_layout.hbs",
        `_${typeSuffix}_layout.hbs`,
    );

    await OutputGenerator.download(
        cleanData,
        formData.format,
        actor.name,
        layoutPath,
        themePath,
    );
}

/* -------------------------------------------- */
/* Context Menu Injection                       */
/* -------------------------------------------- */

function getActorIdFromElement(li) {
    const element = li instanceof jQuery ? li[0] : li;
    return element.dataset?.entryId || element.dataset?.documentId;
}

Hooks.on("getActorContextOptions", (html, options) => {
    options.push({
        name: "RMU_EXPORT.Button.ImportSheet",
        icon: '<i class="rmu-cse-icon html"></i>',
        condition: (li) => {
            const documentId = getActorIdFromElement(li);
            if (!documentId) return false;
            const actor = game.actors.get(documentId);
            return (
                actor && actor.isOwner && VALID_ACTOR_TYPES.includes(actor.type)
            );
        },
        callback: async (li) => {
            const documentId = getActorIdFromElement(li);
            const actor = game.actors.get(documentId);
            await ImportHandler.promptForImport(actor);
        },
    });
});
