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
        label: "Export Sheet",
        class: "rmu-export-btn",
        icon: "fas fa-file-export",
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
        ui.notifications.info(`Generating sheet for ${actor.name}...`);

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
            <div class="form-group">
                <label>Choose Format:</label>
                <select name="format" style="width: 100%; box-sizing: border-box; margin-bottom: 10px;">
                    <option value="html">HTML</option>
                    <option value="json">JSON (Data)</option>
                </select>
            </div>
            <div class="form-group">
                <label>Skill Filter:</label>
                <select name="skillFilter" style="width: 100%; box-sizing: border-box; margin-bottom: 10px;">
                    <option value="ranked">Ranked / Favorites Only</option>
                    <option value="all">Show All Skills</option>
                </select>
            </div>
            <div class="form-group" style="display: flex; align-items: center; gap: 10px;">
                <input type="checkbox" name="showSpells" id="rmu-show-spells" checked />
                <label for="rmu-show-spells">Include Spell Lists?</label>
            </div>
        `;

        await DialogV2.wait({
            window: { title: `Export: ${actor.name}` },
            content: content,
            buttons: [
                {
                    action: "export",
                    label: "Download",
                    icon: "fas fa-file-download",
                    // We pass the actor (or derivedActor) to our helper
                    callback: (event, button, dialog) =>
                        handleExportSubmit(button, derivedActor || actor),
                },
            ],
            close: () => {},
        });
    } catch (error) {
        console.error(`${MODULE_ID} | Export Failed:`, error);
        ui.notifications.error(`Export Failed: ${error.message}`);
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
