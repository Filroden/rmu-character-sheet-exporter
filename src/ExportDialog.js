const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class ExportDialog extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(actor, templates, options = {}) {
        super(options);
        this.actor = actor;

        // Convert the templates object to an array for Handlebars
        this.templates = Object.values(templates);

        // Promise resolution references
        this._resolve = null;
        this._reject = null;
    }

    static get DEFAULT_OPTIONS() {
        return {
            tag: "form",
            id: "rmu-export-dialog",
            classes: ["rmu-cse", "standard-form"],
            position: { width: 400, height: "auto" },
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

    /**
     * Helper to instantiate, render, and wait for user input.
     */
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

    /**
     * Interactivity Logic: Attach listeners after rendering
     */
    _onRender(context, options) {
        super._onRender(context, options);

        const html = this.element;
        const templateSelect = html.querySelector("[name='templatePath']");

        // Bind the change event
        templateSelect.addEventListener(
            "change",
            this._onTemplateChange.bind(this),
        );

        // Trigger immediately to set initial state
        this._onTemplateChange({ target: templateSelect });
    }

    /**
     * Handles showing/hiding fields based on data attributes in the <option>
     */
    _onTemplateChange(event) {
        const select =
            event.target || this.element.querySelector("[name='templatePath']");
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
     * Handle form submission
     */
    static async formHandler(event, form, formData) {
        const app = this;
        // Resolve the promise with the clean object from formData
        if (app._resolve) {
            app._resolve(formData.object);
        }
    }

    /**
     * Handle closing without submitting
     */
    _onClose(options) {
        super._onClose(options);
        // If closed without resolving, we resolve with null to indicate cancellation
        if (this._resolve) this._resolve(null);
    }
}
