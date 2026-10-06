import { EXPORT_CONFIG } from "./ExportConfig.js";
import { ExportHelpers } from "./utils/ExportHelpers.js";

export class OutputGenerator {
    /**
     * Fetches a stylesheet's text. A failed load returns a CSS comment rather than throwing,
     * so a missing theme degrades to an unstyled sheet instead of blocking the export.
     * @param {string} path - Path to the CSS file.
     * @returns {Promise<string>}
     */
    static async fetchStylesheet(path) {
        try {
            const response = await fetch(path);
            if (response.ok) return await response.text();
            console.warn(`RMU Export | Failed to load stylesheet: ${path} (${response.status})`);
            return "/* Failed to load stylesheet. Check console for details. */";
        } catch (error) {
            console.error("RMU Export | CSS Fetch Error:", error);
            return `/* Error loading stylesheet: ${error.message} */`;
        }
    }

    /**
     * Builds the version attributes written on the embedded actor data element.
     * @param {Object} meta - The meta block from DataExtractor.getCleanData.
     * @returns {string} The attributes, each preceded by a space.
     */
    static buildCapsuleAttributes(meta = {}) {
        const attributes = {
            "data-format": meta.capsuleFormat,
            "data-module-version": meta.moduleVersion,
            "data-system-id": meta.systemId,
            "data-system-version": meta.systemVersion,
            "data-core-version": meta.coreVersion,
        };
        return Object.entries(attributes)
            .filter(([, value]) => value !== undefined && value !== null)
            .map(([name, value]) => ` ${name}="${ExportHelpers.escapeHTML(String(value))}"`)
            .join("");
    }

    /**
     * Generates the full HTML string for the character sheet.
     * Combines the structural Handlebars layout with the shared base styles and the visual
     * CSS theme. The base styles come first so that a theme can override them.
     * @param {Object} data - The prepared actor data object (including options)
     * @param {string} layoutPath - Path to the HBS layout template
     * @param {string} themePath - Path to the CSS theme file
     * @returns {Promise<string>} The complete HTML document string
     */
    static async generateHTML(data, layoutPath, themePath) {
        // 1. Render the HTML Layout
        const htmlContent = await foundry.applications.handlebars.renderTemplate(layoutPath, data);

        // 2. Fetch the shared base styles and the chosen theme
        const [baseCss, themeCss] = await Promise.all([this.fetchStylesheet(EXPORT_CONFIG.baseStylesPath), this.fetchStylesheet(themePath)]);

        // 3. Construct the Passive Backup Data.
        // raw_foundry_data is already escaped for embedding (see ExportHelpers.toEmbeddedJSON).
        // The versions that produced the file are stored as data-* attributes rather than
        // inside the JSON, so importers from before these attributes existed still read the
        // block unchanged, while newer importers can check compatibility before importing.
        const backupData = `
            <script id="foundry-actor-data" type="application/json"${this.buildCapsuleAttributes(data.meta)}>
                ${data.raw_foundry_data || "{}"}
            </script>
        `;

        // 4. Assemble the Final Document
        const title = ExportHelpers.escapeHTML(data.header_data?.name || ExportHelpers.i18n("RMU_EXPORT.Common.CharacterSheet", "Character Sheet"));
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>${title}</title>
                <style>
                    ${baseCss}
                    ${themeCss}
                </style>
            </head>
            <body>
                ${htmlContent}
                ${backupData}
            </body>
            </html>
            `;
    }

    /**
     * Triggers a browser download for the generated file using Foundry's native helper.
     * @param {Object} data - The prepared data object
     * @param {string} format - "html" or "json"
     * @param {string} filenameBase - The actor's name for the filename
     * @param {string} layoutPath - Path to the HBS file
     * @param {string} themePath - Path to the CSS file
     */
    static async download(data, format, filenameBase, layoutPath, themePath) {
        // 1. Create a timestamp string for unique filenames
        const now = new Date();
        const dateString = now.toISOString().split("T")[0];
        const timeString = now.toTimeString().split(" ")[0].replaceAll(":", "-");
        const timestamp = `${dateString}_${timeString}`;

        // Clean filename of unsafe characters
        const cleanName = filenameBase.replaceAll(/[^\w\s-]/g, "").replaceAll(/\s+/g, "_");
        const filename = `${cleanName}_Sheet_${timestamp}`;

        if (format === "json") {
            // Save JSON directly
            foundry.utils.saveDataToFile(JSON.stringify(data, null, 2), "text/json", `${filename}.json`);
        } else if (format === "html") {
            // 2. Generate the HTML String
            const fullHtml = await this.generateHTML(data, layoutPath, themePath);

            // 3. Save HTML using Foundry's helper (Fixes Blob/OS warning)
            foundry.utils.saveDataToFile(fullHtml, "text/html", `${filename}.html`);
        }
    }
}
