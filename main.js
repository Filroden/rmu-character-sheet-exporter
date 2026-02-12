import { DataExtractor } from "./src/DataExtractor.js";
import { OutputGenerator } from "./src/OutputGenerator.js";

const MODULE_ID = "rmu-character-sheet-exporter";

Hooks.once("init", () => {
    console.log(`${MODULE_ID} | Initializing RMU Character Sheet Export`);
});

/**
 * -----------------------------------------------------------
 * 1. Actor Sheet Header Button
 * -----------------------------------------------------------
 */
const addHeaderButton = (app, buttons) => {
    const actor = app.document || app.object || app.actor;
    if (!actor) return;

    // Check type (Case Insensitive for safety)
    if (actor.type?.toLowerCase() !== "character") return;

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

/**
 * -----------------------------------------------------------
 * 2. Export Controller (Using ApplicationV2)
 * -----------------------------------------------------------
 */
async function startExportProcess(actor) {
    if (!actor) return;

    try {
        ui.notifications.info(
            game.i18n.format("RMU_EXPORT.Notify.Generating", {
                name: actor.name,
            }),
        );

        // 1. Force the System to calculate derived data
        const derivedActor = await DataExtractor.ensureExtendedData(actor);

        if (!derivedActor) {
            console.warn(
                `${MODULE_ID} | Data initialization failed completely.`,
            );
        }

        // 2. Render V2 Dialog
        const { DialogV2 } = foundry.applications.api;

        const content = `
            <div class="rmu-cse form-group">
                <label>${game.i18n.localize("RMU_EXPORT.Dialog.ChooseFormat")}</label>
                <select name="format" style="width: 100%; box-sizing: border-box; margin-bottom: 10px;">
                    <option value="html">HTML</option>
                    <option value="json">${game.i18n.localize("RMU_EXPORT.Dialog.FormatJSON")}</option>
                </select>
            </div>
            <div class="rmu-cse form-group">
                <label>${game.i18n.localize("RMU_EXPORT.Dialog.SkillFilter")}</label>
                <select name="skillFilter" style="width: 100%; box-sizing: border-box; margin-bottom: 10px;">
                    <option value="ranked">${game.i18n.localize("RMU_EXPORT.Dialog.FilterRanked")}</option>
                    <option value="all">${game.i18n.localize("RMU_EXPORT.Dialog.FilterAll")}</option>
                </select>
            </div>
            <div class="rmu-cse form-group" style="display: flex; align-items: center; gap: 10px;">
                <input class="rmu-cse-checkbox" type="checkbox" name="showSpells" id="rmu-show-spells" checked />
                <label for="rmu-show-spells">${game.i18n.localize("RMU_EXPORT.Dialog.IncludeSpells")}</label>
            </div>
        `;

        await DialogV2.wait({
            window: {
                title: game.i18n.format("RMU_EXPORT.Dialog.Title", {
                    name: actor.name,
                }),
            },
            content: content,
            buttons: [
                {
                    action: "export",
                    label: game.i18n.localize("RMU_EXPORT.Dialog.Download"),
                    icon: "rmu-cse-icon save",
                    // We pass the actor (or derivedActor) to our helper
                    callback: (event, button, dialog) =>
                        handleExportSubmit(button, derivedActor || actor),
                },
            ],
            close: () => {},
        });
    } catch (error) {
        console.error(`${MODULE_ID} | Export Failed:`, error);
        ui.notifications.error(
            game.i18n.format("RMU_EXPORT.Notify.Failed", {
                msg: error.message,
            }),
        );
    }
}

/**
 * Helper: Handles reading the form and triggering the download
 */
async function handleExportSubmit(button, actor) {
    // 1. Extract values from the form elements
    const form = button.form.elements;
    const format = form.format.value;
    const skillFilter = form.skillFilter.value;
    const showSpells = form.showSpells.checked;

    // 2. Build Options Object
    const exportOptions = {
        showAllSkills: skillFilter === "all",
        showSpells: showSpells,
    };

    // 3. Extract Data
    console.log("RMU Export | Options:", exportOptions);
    const cleanData = DataExtractor.getCleanData(actor, exportOptions);

    // 4. Generate Output
    await OutputGenerator.download(cleanData, format, actor.name);
}
