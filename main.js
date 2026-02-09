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
        // Returns the Actor (or Token.actor) that actually has the data
        const derivedActor = await DataExtractor.ensureExtendedData(actor);

        if (!derivedActor) {
            console.warn(
                `${MODULE_ID} | Data initialization failed completely.`,
            );
        }

        // 2. Extract Data from the correct source
        const cleanData = DataExtractor.getCleanData(derivedActor || actor);

        console.log(`${MODULE_ID} | Extracted Data:`, cleanData);

        // 3. Render V2 Dialog
        const { DialogV2 } = foundry.applications.api;

        const content = `
            <div class="form-group">
                <label>Choose Format:</label>
                <select name="format" style="width: 100%; box-sizing: border-box;">
                    <option value="html">HTML (Best for Print/Word)</option>
                    <option value="json">JSON (Data)</option>
                </select>
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
                    callback: async (event, button, dialog) => {
                        // Extract value from the HTML inside the dialog
                        const format = button.form.elements.format.value;
                        await OutputGenerator.download(
                            cleanData,
                            format,
                            actor.name,
                        );
                    },
                },
            ],
            close: () => {},
        });
    } catch (error) {
        console.error(`${MODULE_ID} | Export Failed:`, error);
        ui.notifications.error(`Export Failed: ${error.message}`);
    }
}
