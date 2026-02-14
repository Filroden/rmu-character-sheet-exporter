import { DataExtractor } from "./src/DataExtractor.js";
import { OutputGenerator } from "./src/OutputGenerator.js";
import { ExportDialog } from "./src/ExportDialog.js";

const MODULE_ID = "rmu-character-sheet-exporter";

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
            path: "modules/rmu-character-sheet-exporter/styles/standard.css",
        },
        dark: {
            id: "dark",
            label: "RMU_EXPORT.Themes.DarkMode",
            path: "modules/rmu-character-sheet-exporter/styles/dark.css",
        },
        boba: {
            id: "boba",
            label: "RMU_EXPORT.Themes.Boba",
            path: "modules/rmu-character-sheet-exporter/styles/boba.css",
        },
        print: {
            id: "print",
            label: "RMU_EXPORT.Themes.PrintHighContrast",
            path: "modules/rmu-character-sheet-exporter/styles/print.css",
        },
    },

    sections: {
        header: { label: "RMU_EXPORT.Section.Header", default: true },
        quick_info: { label: "RMU_EXPORT.Section.QuickInfo", default: true },
        stats: { label: "RMU_EXPORT.Section.Stats", default: true },
        defenses: { label: "RMU_EXPORT.Section.Defenses", default: true },
        attacks: { label: "RMU_EXPORT.Section.Attacks", default: true },
        skills: { label: "RMU_EXPORT.Section.Skills", default: true },
        spells: { label: "RMU_EXPORT.Section.SpellLists", default: true },
        inventory: { label: "RMU_EXPORT.Section.Inventory", default: true },
        talents: { label: "RMU_EXPORT.Section.Talents", default: true },
    },
};

Hooks.once("init", () => {
    console.log(`${MODULE_ID} | Initializing RMU Character Sheet Export`);
});

const addHeaderButton = (app, buttons) => {
    const actor = app.document || app.object || app.actor;
    if (!actor) return;

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

async function startExportProcess(actor) {
    if (!actor) return;

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
    // 1. Extract selections
    const layoutId = formData.layout;
    const themeId = formData.theme;

    // 2. Build the 'options' object from the form checkboxes
    // We iterate over the config sections to find their matching values in formData
    const sectionOptions = {};
    Object.keys(RMU_EXPORT_CONFIG.sections).forEach((key) => {
        sectionOptions[key] = formData[key];
    });

    // Special handling for Skill Filters (keep existing logic)
    const skillFilter = formData.skillFilter || "ranked";
    sectionOptions.showAllSkills = skillFilter === "all";

    // 3. Get Clean Data
    const cleanData = DataExtractor.getCleanData(actor, sectionOptions);

    // 4. Resolve Paths
    const layoutPath = RMU_EXPORT_CONFIG.layouts[layoutId].path;
    const themePath = RMU_EXPORT_CONFIG.themes[themeId].path;

    // 5. Generate with BOTH paths
    await OutputGenerator.download(
        cleanData,
        formData.format,
        actor.name,
        layoutPath,
        themePath,
    );
}
