import { DataExtractor } from "./src/DataExtractor.js";
import { OutputGenerator } from "./src/OutputGenerator.js";
import { ExportDialog } from "./src/ExportDialog.js";

const MODULE_ID = "rmu-character-sheet-exporter";

// 1. Define templates configuration
const AVAILABLE_TEMPLATES = {
    standard: {
        id: "standard",
        label: "RMU_EXPORT.Templates.Standard",
        path: "modules/rmu-character-sheet-exporter/templates/standard_actor_sheet.hbs",
        config: {
            showSkillFilter: true,
            showSpellFilter: true,
        },
    },
    compact: {
        id: "compact",
        label: "RMU_EXPORT.Templates.Compact",
        path: "modules/rmu-character-sheet-exporter/templates/compact_actor_sheet.hbs",
        config: {
            showSkillFilter: false,
            forcedSkillFilter: "ranked", // Used in submission logic
            showSpellFilter: false,
            forcedShowSpells: false, // Used in submission logic
        },
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
        ui.notifications.info(
            game.i18n.format("RMU_EXPORT.Notify.Generating", {
                name: actor.name,
            }),
        );

        const derivedActor = await DataExtractor.ensureExtendedData(actor);

        if (!derivedActor) {
            console.warn(
                `${MODULE_ID} | Data initialization failed completely.`,
            );
        }

        // 2. Use the Custom ApplicationV2 Class
        const result = await ExportDialog.wait(
            derivedActor || actor,
            AVAILABLE_TEMPLATES,
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
    const templatePath = formData.templatePath;
    const format = formData.format;

    // Default values from form
    let skillFilter = formData.skillFilter;
    let showSpells = formData.showSpells;

    // 3. Apply Forced Overrides
    // We look up the config again to apply security overrides (in case hidden fields were manipulated or missing)
    const templateKey = Object.keys(AVAILABLE_TEMPLATES).find(
        (k) => AVAILABLE_TEMPLATES[k].path === templatePath,
    );
    const config = AVAILABLE_TEMPLATES[templateKey]?.config || {};

    if (config.forcedSkillFilter !== undefined) {
        skillFilter = config.forcedSkillFilter;
    }
    if (config.forcedShowSpells !== undefined) {
        showSpells = config.forcedShowSpells;
    }

    const exportOptions = {
        showAllSkills: skillFilter === "all",
        showSpells: showSpells,
    };

    console.log("RMU Export | Options:", exportOptions);
    const cleanData = DataExtractor.getCleanData(actor, exportOptions);

    await OutputGenerator.download(cleanData, format, actor.name, templatePath);
}
