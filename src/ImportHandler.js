import { CAPSULE_FORMAT } from "./ExportConfig.js";
import { ExportHelpers } from "./utils/ExportHelpers.js";

const { DialogV2 } = foundry.applications.api;

export class ImportHandler {
    /**
     * Prompts the user to select a file from their computer.
     */
    static async promptForImport(actor) {
        const content = `
        <div class="form-group">
            <label>${game.i18n.localize("RMU_EXPORT.Import.SelectFile")}</label>
            <div class="form-fields">
                <input type="file" name="file" accept=".html">
            </div>
        </div>
        <p class="notes">
            <i class="rmu-cse-icon warning"></i> 
            ${game.i18n.format("RMU_EXPORT.Import.Warning", { name: ExportHelpers.escapeHTML(actor.name) })}
        </p>
        `;

        const result = await DialogV2.wait({
            window: {
                title: game.i18n.localize("RMU_EXPORT.Button.ImportSheetHeader"),
                icon: "rmu-cse-icon html",
            },
            classes: ["rmu-cse", "standard-form"],
            width: 300,
            content: content,
            buttons: [
                {
                    action: "import",
                    label: game.i18n.localize("RMU_EXPORT.Button.Import"),
                    icon: "rmu-cse-icon html",
                    callback: (event, button, dialog) => {
                        const form = dialog.element.querySelector("input[name='file']");
                        const file = form?.files[0];
                        if (!file) {
                            ui.notifications.warn(game.i18n.localize("RMU_EXPORT.Import.NoFile"));
                            return null;
                        }
                        return file;
                    },
                },
                {
                    action: "cancel",
                    label: game.i18n.localize("Cancel"),
                    icon: "rmu-cse-icon cancel",
                },
            ],
            default: "import",
        });

        if (result) {
            await this.processFile(actor, result);
        }
    }

    /**
     * Reads the exported HTML file and extracts the embedded actor data.
     */
    static async processFile(actor, file) {
        const text = await file.text();
        let jsonData = null;
        let capsuleAttributes = {};

        try {
            // Parse HTML to find the embedded script tag
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, "text/html");
            const script = doc.getElementById("foundry-actor-data");

            if (!script) {
                ui.notifications.error(game.i18n.localize("RMU_EXPORT.Import.NoData"));
                return;
            }
            jsonData = JSON.parse(script.textContent);
            capsuleAttributes = { ...script.dataset };
        } catch (err) {
            console.error("RMU Export | Failed to parse file:", err);
            ui.notifications.error(game.i18n.format("RMU_EXPORT.Import.ParseFailed", { msg: err.message }));
            return;
        }

        const capsuleInfo = this.readCapsuleInfo(capsuleAttributes, jsonData);
        if (!(await this.confirmCompatibility(capsuleInfo))) return;

        await this.updateActor(actor, jsonData);
    }

    /* -------------------------------------------- */
    /* Version checks                               */
    /* -------------------------------------------- */

    /**
     * Collects the versions that produced an exported file.
     * Files from 1.8.0 onwards carry them as data-* attributes on the embedded data element.
     * For older files the attributes are missing, so the system and core versions are read from
     * Foundry's own _stats block in the actor data where it exists. Files that have neither
     * (exports from 1.7.x and earlier) report no versions and import as before.
     * @param {DOMStringMap|Object} attributes - The data-* attributes of the embedded element.
     * @param {Object} actorData - The parsed actor data.
     * @returns {{format: number, moduleVersion: string, systemId: string, systemVersion: string, coreVersion: string}}
     */
    static readCapsuleInfo(attributes, actorData) {
        const stats = actorData?._stats ?? {};
        return {
            format: Number.parseInt(attributes.format, 10) || 0,
            moduleVersion: attributes.moduleVersion || "",
            systemId: attributes.systemId || stats.systemId || "",
            systemVersion: attributes.systemVersion || stats.systemVersion || "",
            coreVersion: attributes.coreVersion || stats.coreVersion || "",
        };
    }

    /**
     * Returns the reason a file must not be imported, or null if it may be.
     * A newer capsule format means this importer cannot read the data reliably, and data from a
     * different game system would not fit an RMU actor at all.
     * @param {Object} info - Result of readCapsuleInfo.
     * @returns {string|null} A localised message, or null.
     */
    static getBlockingReason(info) {
        if (info.format > CAPSULE_FORMAT) {
            const version = info.moduleVersion || ExportHelpers.i18n("RMU_EXPORT.Common.Unknown", "Unknown");
            return game.i18n.format("RMU_EXPORT.Import.FormatTooNew", { version });
        }
        if (info.systemId && info.systemId !== game.system.id) {
            return game.i18n.format("RMU_EXPORT.Import.WrongSystem", { system: info.systemId });
        }
        return null;
    }

    /**
     * Lists the ways a file is newer than this world. Foundry and the RMU system migrate data
     * forwards from older versions, but nothing converts data written by a newer version back,
     * so the user is asked to confirm before such data overwrites an actor.
     * @param {Object} info - Result of readCapsuleInfo.
     * @returns {string[]} Localised warning lines (empty if the file is not newer).
     */
    static getNewerVersionWarnings(info) {
        const isNewer = foundry.utils.isNewerVersion;
        const warnings = [];
        if (info.systemVersion && isNewer(info.systemVersion, game.system.version)) {
            warnings.push(game.i18n.format("RMU_EXPORT.Import.SystemNewer", { fileVersion: info.systemVersion, worldVersion: game.system.version }));
        }
        if (info.coreVersion && isNewer(info.coreVersion, game.version)) {
            warnings.push(game.i18n.format("RMU_EXPORT.Import.CoreNewer", { fileVersion: info.coreVersion, worldVersion: game.version }));
        }
        return warnings;
    }

    /**
     * Checks a file's versions, blocking incompatible files and asking the user to confirm
     * files from newer versions.
     * @param {Object} info - Result of readCapsuleInfo.
     * @returns {Promise<boolean>} True if the import should go ahead.
     */
    static async confirmCompatibility(info) {
        const blockingReason = this.getBlockingReason(info);
        if (blockingReason) {
            ui.notifications.error(blockingReason);
            return false;
        }

        const warnings = this.getNewerVersionWarnings(info);
        if (warnings.length === 0) return true;

        const listItems = warnings.map((line) => `<li>${ExportHelpers.escapeHTML(line)}</li>`).join("");
        const confirmed = await DialogV2.confirm({
            window: { title: game.i18n.localize("RMU_EXPORT.Import.VersionWarningTitle"), icon: "rmu-cse-icon warning" },
            classes: ["rmu-cse"],
            content: `
                <p>${game.i18n.localize("RMU_EXPORT.Import.VersionWarningIntro")}</p>
                <ul>${listItems}</ul>
                <p>${game.i18n.localize("RMU_EXPORT.Import.VersionWarningOutro")}</p>
            `,
        });
        return confirmed === true;
    }

    /**
     * Validates the imported data and replaces the actor with it.
     * The actor's current data is kept in memory first. The replacement is a single database
     * update, so a failure should leave the actor untouched; the snapshot is still written
     * back as a safeguard in case the failure happened after any part of the change was saved.
     */
    static async updateActor(actor, sourceData) {
        // Strict Type Check (Case Sensitive for RMU)
        if (sourceData.type !== actor.type) {
            ui.notifications.error(
                game.i18n.format("RMU_EXPORT.Import.TypeMismatch", {
                    source: sourceData.type,
                    target: actor.type,
                }),
            );
            return;
        }

        const snapshot = actor.toObject();

        try {
            // Foundry's importFromJSON shows its own success notification, so none is added here.
            await this.replaceActorData(actor, sourceData);
        } catch (err) {
            console.error("RMU Export | Import Failed:", err);
            await this.restoreSnapshot(actor, snapshot);
        }
    }

    /**
     * Writes a previously taken snapshot back to the actor after a failed import.
     * @param {Actor} actor - The actor to restore.
     * @param {Object} snapshot - The result of actor.toObject() taken before the import.
     */
    static async restoreSnapshot(actor, snapshot) {
        try {
            await this.replaceActorData(actor, snapshot);
            ui.notifications.error(game.i18n.localize("RMU_EXPORT.Import.FailedRestored"));
        } catch (restoreErr) {
            console.error("RMU Export | Restoring the actor after a failed import also failed:", restoreErr);
            ui.notifications.error(game.i18n.localize("RMU_EXPORT.Import.FailedNotRestored"));
        }
    }

    /**
     * Replaces all of an actor's data, items and effects with the given document data.
     *
     * This uses Foundry's native Document#importFromJSON (the same path as the sidebar's
     * "Import Data" option), which writes everything in a single database update with
     * recursive: false. That matters for two reasons:
     *  - The actor is never left without items part-way through. The RMU system cannot prepare
     *    a character that has no race item, so deleting the items first and recreating them
     *    afterwards made the system's data preparation throw on every intermediate step.
     *  - Embedded items are written as stored data rather than created one by one, so the
     *    system's item creation hooks do not run. Those hooks are meant for players adding
     *    items by hand (for example, the system refuses a fighting style item on its own
     *    because it creates one alongside the style skill), not for restoring a saved actor.
     * Embedded documents keep their original ids, so items that refer to each other by id
     * (fighting style and ability items point at their skill item) stay linked.
     * importFromJSON keeps the target actor's own id, folder, sort order and ownership.
     * @param {Actor} actor - The actor to overwrite.
     * @param {Object} sourceData - Actor document data, as produced by actor.toObject().
     */
    static async replaceActorData(actor, sourceData) {
        const importData = foundry.utils.deepClone(sourceData);

        // Foundry's own token and permission flags belong to the original actor, not the copy.
        delete importData.flags?.core;

        await actor.importFromJSON(JSON.stringify(importData));
    }
}
