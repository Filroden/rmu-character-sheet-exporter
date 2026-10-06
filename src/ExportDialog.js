import { DataExtractor } from "./DataExtractor.js";
import { OutputGenerator } from "./OutputGenerator.js";
import { EXPORT_CONFIG, buildSectionOptions, isSectionValidForType, resolveLayoutPath, resolveThemePath } from "./ExportConfig.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

// Delay before the preview refreshes after a change, so rapid toggling does not re-render the
// sheet for every click.
const PREVIEW_DEBOUNCE_MS = 500;

// Checkbox values arrive from the browser's FormData as the string "on".
const CHECKBOX_ON = "on";

export class ExportDialog extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(actor, options = {}) {
        super(options);
        this.actor = actor;
        this._resolve = null;

        this._debouncedPreview = foundry.utils.debounce(this._refreshPreview.bind(this), PREVIEW_DEBOUNCE_MS);
    }

    static get DEFAULT_OPTIONS() {
        return {
            tag: "form",
            id: "rmu-export-dialog",
            classes: ["rmu-cse", "standard-form"],
            position: { width: 1200, height: 800 },
            window: {
                icon: "rmu-cse-icon export",
                resizable: true,
                title: "RMU_EXPORT.Button.ExportSheet",
            },
            form: {
                handler: ExportDialog.formHandler,
                submitOnChange: false,
                closeOnSubmit: true,
            },
        };
    }

    static get PARTS() {
        return {
            form: {
                template: "modules/rmu-character-sheet-exporter/templates/export_dialog.hbs",
            },
        };
    }

    /**
     * Opens the dialog and resolves with the submitted form data, or null if it is closed.
     * @param {Actor} actor - The actor being exported.
     * @returns {Promise<Object|null>}
     */
    static async wait(actor) {
        return new Promise((resolve) => {
            const app = new ExportDialog(actor, {
                window: {
                    title: game.i18n.format("RMU_EXPORT.Dialog.Title", {
                        name: actor.name,
                    }),
                },
            });
            app._resolve = resolve;
            app.render(true);
        });
    }

    async _prepareContext(_options) {
        const availableSections = {};
        for (const [key, sectionConfig] of Object.entries(EXPORT_CONFIG.sections)) {
            if (isSectionValidForType(sectionConfig, this.actor.type)) {
                availableSections[key] = sectionConfig;
            }
        }

        return {
            actor: this.actor,
            layouts: Object.values(EXPORT_CONFIG.layouts),
            themes: Object.values(EXPORT_CONFIG.themes),
            sections: availableSections,
            defaultLayout: "standard",
            defaultTheme: "standard",
        };
    }

    /* -------------------------------------------- */
    /* Event Listeners & Logic                     */
    /* -------------------------------------------- */

    /**
     * Binds the change listener once. The application's root element survives re-renders
     * (only its parts are replaced), so binding in _onRender would add a duplicate listener
     * every time the dialog re-renders.
     */
    _onFirstRender(context, options) {
        super._onFirstRender(context, options);
        this.element.addEventListener("change", () => this._debouncedPreview());
    }

    _onRender(context, options) {
        super._onRender(context, options);
        this._refreshPreview();
    }

    /**
     * Shows a short status message above the preview (an empty string clears it).
     * @param {string} message - The message to show.
     */
    _setStatus(message) {
        const status = this.element.querySelector(".status-message");
        if (status) status.innerText = message;
    }

    async _refreshPreview() {
        // Locate the form, whether it is the root element or a child.
        const form = this.element.tagName === "FORM" ? this.element : this.element.querySelector("form");
        const frame = this.element.querySelector("iframe.preview-frame");
        if (!form || !frame) return;

        const formValues = Object.fromEntries(new FormData(form).entries());

        const layoutPath = resolveLayoutPath(formValues.layout, this.actor.type);
        const themePath = resolveThemePath(formValues.theme);
        if (!layoutPath || !themePath) {
            console.warn("RMU Export | Missing layout or theme path.");
            this._setStatus(game.i18n.localize("RMU_EXPORT.Dialog.InvalidSelection"));
            return;
        }

        this._setStatus(game.i18n.localize("RMU_EXPORT.Dialog.GeneratingPreview"));

        const sectionOptions = buildSectionOptions(this.actor.type, (key) => formValues[key] === CHECKBOX_ON, formValues.skillFilter);
        const cleanData = await DataExtractor.getCleanData(this.actor, sectionOptions);
        const htmlContent = await OutputGenerator.generateHTML(cleanData, layoutPath, themePath);

        // Binding the HTML to the srcdoc attribute (rather than writing into the frame's
        // document) keeps the preview intact when Foundry v14 re-parents a popped-out window.
        frame.srcdoc = htmlContent;

        this._setStatus("");
    }

    /* -------------------------------------------- */
    /* Form Handling                               */
    /* -------------------------------------------- */

    static async formHandler(_event, _form, formData) {
        this._resolve?.(formData.object);
        this._resolve = null;
    }

    _onClose(options) {
        super._onClose(options);
        // Resolves with null only if the form was not submitted first.
        this._resolve?.(null);
        this._resolve = null;
    }
}
