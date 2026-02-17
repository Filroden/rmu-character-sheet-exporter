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
            ${game.i18n.format("RMU_EXPORT.Import.Warning", { name: actor.name })}
        </p>
        `;

        const result = await DialogV2.wait({
            window: {
                title: game.i18n.localize(
                    "RMU_EXPORT.Button.ImportSheetHeader",
                ),
                icon: "rmu-cse-icon html",
            },
            classes: ["rmu-cse"],
            width: 300,
            content: content,
            buttons: [
                {
                    action: "import",
                    label: game.i18n.localize("RMU_EXPORT.Button.Import"),
                    icon: "rmu-cse-icon html",
                    callback: (event, button, dialog) => {
                        const form =
                            dialog.element.querySelector("input[name='file']");
                        const file = form?.files[0];
                        if (!file) {
                            ui.notifications.warn("No file selected.");
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
            classes: ["rmu-cse", "standard-form"],
        });

        if (result) {
            await this.processFile(actor, result);
        }
    }

    /**
     * Reads the file and routes it based on extension (HTML vs JSON)
     */
    static async processFile(actor, file) {
        const text = await file.text();
        let jsonData = null;

        try {
            // Parse HTML to find the embedded script tag
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, "text/html");
            const script = doc.getElementById("foundry-actor-data");

            if (script) {
                jsonData = JSON.parse(script.textContent);
            } else {
                throw new Error(
                    "Could not find embedded actor data (#foundry-actor-data) in this HTML file.",
                );
            }
        } catch (err) {
            console.error(err);
            return ui.notifications.error(
                "RMU Export | Failed to parse file: " + err.message,
            );
        }

        if (jsonData) {
            await this.updateActor(actor, jsonData);
        }
    }

    /**
     * Validates and updates the actor.
     */
    static async updateActor(actor, sourceData) {
        // 1. Strict Type Check (Case Sensitive for RMU)
        if (sourceData.type !== actor.type) {
            return ui.notifications.error(
                game.i18n.format("RMU_EXPORT.Import.TypeMismatch", {
                    source: sourceData.type,
                    target: actor.type,
                }),
            );
        }

        // 2. Prepare the update object
        const updateData = foundry.utils.deepClone(sourceData);

        // 3. CLEANUP
        delete updateData._id;
        delete updateData.folder;
        delete updateData.ownership;
        delete updateData.sort;
        delete updateData.flags?.core;

        if (updateData.prototypeToken) {
            delete updateData.prototypeToken.actorId;
        }

        // 4. EMBEDDED DOCUMENTS STRATEGY: Wipe and Replace
        try {
            const itemIds = actor.items.map((i) => i.id);
            const effectIds = actor.effects.map((e) => e.id);

            if (itemIds.length > 0)
                await actor.deleteEmbeddedDocuments("Item", itemIds);
            if (effectIds.length > 0)
                await actor.deleteEmbeddedDocuments("ActiveEffect", effectIds);

            const itemsToCreate = updateData.items || [];
            const effectsToCreate = updateData.effects || [];

            delete updateData.items;
            delete updateData.effects;

            await actor.update(updateData);

            if (itemsToCreate.length > 0)
                await actor.createEmbeddedDocuments("Item", itemsToCreate);
            if (effectsToCreate.length > 0)
                await actor.createEmbeddedDocuments(
                    "ActiveEffect",
                    effectsToCreate,
                );

            ui.notifications.info(
                game.i18n.format("RMU_EXPORT.Import.Success", {
                    name: actor.name,
                }),
            );
        } catch (err) {
            console.error("RMU Export | Import Failed:", err);
            ui.notifications.error("Import failed. Check console for details.");
        }
    }
}
