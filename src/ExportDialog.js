import { DataExtractor } from "./DataExtractor.js";
import { OutputGenerator } from "./OutputGenerator.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class ExportDialog extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(actor, config, options = {}) {
        super(options);
        this.actor = actor;
        this.config = config;
        this._resolve = null;
        this._reject = null;

        // Debounce the preview refresh to prevent lag on rapid changes
        this._debouncedPreview = foundry.utils.debounce(
            this._refreshPreview.bind(this),
            500,
        );
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
                template:
                    "modules/rmu-character-sheet-exporter/templates/export_dialog.hbs",
            },
        };
    }

    static async wait(actor, config) {
        return new Promise((resolve, reject) => {
            const app = new ExportDialog(actor, config, {
                window: {
                    title: game.i18n.format("RMU_EXPORT.Dialog.Title", {
                        name: actor.name,
                    }),
                },
            });
            app._resolve = resolve;
            app._reject = reject;
            app.render(true);
        });
    }

    async _prepareContext(options) {
        // Prepare lists for the select dropdowns
        const layouts = Object.values(this.config.layouts);
        const themes = Object.values(this.config.themes);

        const availableSections = {};
        for (const [key, sectionConfig] of Object.entries(
            this.config.sections,
        )) {
            if (
                !sectionConfig.validTypes ||
                sectionConfig.validTypes.includes(this.actor.type)
            ) {
                availableSections[key] = sectionConfig;
            }
        }

        return {
            actor: this.actor,
            layouts: layouts,
            themes: themes,
            sections: availableSections, // <-- We use the filtered list here
            defaultLayout: "standard",
            defaultTheme: "standard",
        };
    }

    /* -------------------------------------------- */
    /* Event Listeners & Logic                     */
    /* -------------------------------------------- */

    _onRender(context, options) {
        super._onRender(context, options);

        const html = this.element;

        // Listen for ANY input change (selects or checkboxes)
        html.addEventListener("change", (event) => {
            this._debouncedPreview();
        });

        this._refreshPreview();
    }

    async _refreshPreview() {
        const frame = this.element.querySelector("#rmu-preview-frame");
        const status = this.element.querySelector("#preview-status");
        if (!frame) return;

        if (status) status.innerText = "Refreshing...";

        const form = this.element;
        const formData = new FormData(form);

        const layoutId = formData.get("layout");
        const themeId = formData.get("theme");

        const exportOptions = {
            showAllSkills: formData.get("skillFilter") === "all",
        };

        if (this.config && this.config.sections) {
            Object.keys(this.config.sections).forEach((key) => {
                exportOptions[key] = formData.get(key) !== null;
            });
        }

        const cleanData = await DataExtractor.getCleanData(
            this.actor,
            exportOptions,
        );

        // Get the base path from config
        let layoutPath = this.config?.layouts?.[layoutId]?.path;
        const themePath = this.config?.themes?.[themeId]?.path;

        if (!layoutPath || !themePath) {
            console.warn("RMU Export | Missing layout or theme path.");
            if (status) status.innerText = "Error: Invalid selection";
            return;
        }

        const typeSuffix = this.actor.type.toLowerCase();
        if (layoutPath.includes("_layout.hbs")) {
            layoutPath = layoutPath.replace(
                "_layout.hbs",
                `_${typeSuffix}_layout.hbs`,
            );
        }

        const htmlContent = await OutputGenerator.generateHTML(
            cleanData,
            layoutPath,
            themePath,
        );

        const doc = frame.contentDocument || frame.contentWindow.document;
        doc.open();
        doc.write(htmlContent);
        doc.close();

        if (status) status.innerText = "";
    }

    /* -------------------------------------------- */
    /* Form Handling                               */
    /* -------------------------------------------- */

    static async formHandler(event, form, formData) {
        const app = this;
        if (app._resolve) {
            app._resolve(formData.object);
        }
    }

    _onClose(options) {
        super._onClose(options);
        if (this._resolve) this._resolve(null);
    }
}
