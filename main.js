import { DataExtractor } from "./src/DataExtractor.js";
import { OutputGenerator } from "./src/OutputGenerator.js";
import { ExportDialog } from "./src/ExportDialog.js";
import { ImportHandler } from "./src/ImportHandler.js";
import { MODULE_ID, VALID_ACTOR_TYPES, buildSectionOptions, resolveLayoutPath, resolveThemePath } from "./src/ExportConfig.js";

Hooks.once("init", () => {
    console.log(`${MODULE_ID} | Initializing RMU Character Sheet Export`);
});

/* -------------------------------------------- */
/* Application V1 Header Buttons                */
/* -------------------------------------------- */

const addHeaderButton = (app, buttons) => {
    const actor = app.document || app.object || app.actor;
    if (!actor) return;

    if (!VALID_ACTOR_TYPES.has(actor.type)) return;

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

    if (!VALID_ACTOR_TYPES.has(actor.type)) return;

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

    const hasActiveToken = actor.isToken || (actor.getActiveTokens && actor.getActiveTokens().length > 0);

    if (!hasActiveToken) {
        ui.notifications.warn(game.i18n.localize("RMU_EXPORT.Notify.TokenRequired"));
        return;
    }

    try {
        const derivedActor = await DataExtractor.ensureExtendedData(actor);

        if (!derivedActor) {
            console.warn(`${MODULE_ID} | Data initialization failed completely.`);
        }

        const result = await ExportDialog.wait(derivedActor || actor);

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
    // Sections that do not apply to this actor type are forced off, so no extractor runs for
    // data the actor cannot have (e.g. stats on a Loot actor).
    const sectionOptions = buildSectionOptions(actor.type, (key) => formData[key], formData.skillFilter);
    const cleanData = await DataExtractor.getCleanData(actor, sectionOptions);

    const layoutPath = resolveLayoutPath(formData.layout, actor.type);
    const themePath = resolveThemePath(formData.theme);

    await OutputGenerator.download(cleanData, formData.format, actor.name, layoutPath, themePath);
}

/* -------------------------------------------- */
/* Context Menu Injection                       */
/* -------------------------------------------- */

function getActorIdFromElement(li) {
    // Foundry v13 can still pass a jQuery object to context menu callbacks; v14 passes an element.
    const element = globalThis.jQuery && li instanceof globalThis.jQuery ? li[0] : li;
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
            return actor?.isOwner && VALID_ACTOR_TYPES.has(actor.type);
        },
        callback: async (li) => {
            const documentId = getActorIdFromElement(li);
            const actor = game.actors.get(documentId);
            await ImportHandler.promptForImport(actor);
        },
    });
});
