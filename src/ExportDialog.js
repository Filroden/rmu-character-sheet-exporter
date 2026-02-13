import { DataExtractor } from "./DataExtractor.js";
import { OutputGenerator } from "./OutputGenerator.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class ExportDialog extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(actor, templates, options = {}) {
        super(options);
        this.actor = actor;
        this.templates = Object.values(templates);
        this.templatesMap = templates; // Keep original object for config lookups

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
            position: { width: 1200, height: 800 }, // Wider window for side-by-side
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

    static async wait(actor, templates) {
        return new Promise((resolve, reject) => {
            const app = new ExportDialog(actor, templates, {
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
        return {
            templates: this.templates,
            actor: this.actor,
        };
    }

    /* -------------------------------------------- */
    /* Event Listeners & Logic                     */
    /* -------------------------------------------- */

    _onRender(context, options) {
        super._onRender(context, options);

        const html = this.element;
        const templateSelect = html.querySelector("[name='templatePath']");

        // 1. Listen for Template Changes (Show/Hide Fields)
        if (templateSelect) {
            templateSelect.addEventListener(
                "change",
                this._onTemplateChange.bind(this),
            );
            // Set initial visibility
            this._onTemplateChange({ target: templateSelect });
        }

        // 2. Listen for ANY input change to update the preview
        html.addEventListener("change", (event) => {
            this._debouncedPreview();
        });

        // 3. Initial Preview Render
        this._refreshPreview();
    }

    /**
     * Toggles visibility of setting groups based on the selected template's config.
     */
    _onTemplateChange(event) {
        const select = event.target;
        const option = select.options[select.selectedIndex];

        const showSkills = option.dataset.showSkills === "true";
        const showSpells = option.dataset.showSpells === "true";

        const skillGroup = this.element.querySelector(
            "[data-id='group-skills']",
        );
        const spellGroup = this.element.querySelector(
            "[data-id='group-spells']",
        );

        if (skillGroup) skillGroup.style.display = showSkills ? "flex" : "none";
        if (spellGroup) spellGroup.style.display = showSpells ? "flex" : "none";
    }

    /**
     * Gathers form data, generates the HTML, and injects it into the iframe.
     */
    async _refreshPreview() {
        const frame = this.element.querySelector("#rmu-preview-frame");
        const status = this.element.querySelector("#preview-status");
        if (!frame) return;

        // Visual feedback
        if (status) status.innerText = "Refreshing...";

        // 1. Gather Current Form Data
        // ApplicationV2 doesn't have a simple .getData() method for the form element yet like V1,
        // so we manually query the inputs we care about.
        const templatePath = this.element.querySelector(
            "[name='templatePath']",
        ).value;
        const skillFilter = this.element.querySelector(
            "[name='skillFilter']",
        ).value;
        const showSpells = this.element.querySelector(
            "[name='showSpells']",
        ).checked;

        // 2. Resolve Config Overrides (Security/Logic check)
        // We need to look up the 'key' (e.g., 'compact') from the templatePath to find its config
        const templateEntry = this.templates.find(
            (t) => t.path === templatePath,
        );
        const config = templateEntry?.config || {};

        let finalSkillFilter = skillFilter;
        let finalShowSpells = showSpells;

        if (config.forcedSkillFilter !== undefined)
            finalSkillFilter = config.forcedSkillFilter;
        if (config.forcedShowSpells !== undefined)
            finalShowSpells = config.forcedShowSpells;

        // 3. Extract Data using the options
        const exportOptions = {
            showAllSkills: finalSkillFilter === "all",
            showSpells: finalShowSpells,
        };

        const cleanData = DataExtractor.getCleanData(this.actor, exportOptions);

        // 4. Generate HTML string
        const htmlContent = await OutputGenerator.generateHTML(
            cleanData,
            templatePath,
        );

        // 5. Inject into Iframe
        // We write to the document so relative links (like CSS if needed) might be tricky,
        // but since we inline styles or use absolute module paths, it should work.
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
