export class OutputGenerator {
    /**
     * Generates the full HTML string for the character sheet.
     * Combines the structural Handlebars layout with the visual CSS theme.
     * @param {Object} data - The prepared actor data object (including options)
     * @param {string} layoutPath - Path to the HBS layout template
     * @param {string} themePath - Path to the CSS theme file
     * @returns {Promise<string>} The complete HTML document string
     */
    static async generateHTML(data, layoutPath, themePath) {
        // 1. Render the HTML Layout
        const htmlContent =
            await foundry.applications.handlebars.renderTemplate(
                layoutPath,
                data,
            );

        // 2. Fetch the CSS Theme
        let cssContent = "";
        try {
            const response = await fetch(themePath);
            if (response.ok) {
                cssContent = await response.text();
            } else {
                console.warn(
                    `RMU Export | Failed to load theme CSS: ${themePath} (${response.status})`,
                );
                cssContent =
                    "/* Failed to load theme CSS. Check console for details. */";
            }
        } catch (error) {
            console.error("RMU Export | CSS Fetch Error:", error);
            cssContent = `/* Error loading theme: ${error.message} */`;
        }

        // 3. Construct the Passive Backup Data
        const backupData = `
            <script id="foundry-actor-data" type="application/json">
                ${data.raw_foundry_data || "{}"}
            </script>
        `;

        // 4. Assemble the Final Document
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>${data.header_data?.name || "Character Sheet"}</title>
                <style>
                    ${cssContent}
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
        const timeString = now.toTimeString().split(" ")[0].replace(/:/g, "-");
        const timestamp = `${dateString}_${timeString}`;

        // Clean filename of unsafe characters
        const cleanName = filenameBase
            .replace(/[^\w\s-]/g, "")
            .replace(/\s+/g, "_");
        const filename = `${cleanName}_Sheet_${timestamp}`;

        if (format === "json") {
            // Save JSON directly
            foundry.utils.saveDataToFile(
                JSON.stringify(data, null, 2),
                "text/json",
                `${filename}.json`,
            );
        } else if (format === "html") {
            // 2. Generate the HTML String
            const fullHtml = await this.generateHTML(
                data,
                layoutPath,
                themePath,
            );

            // 3. Save HTML using Foundry's helper (Fixes Blob/OS warning)
            foundry.utils.saveDataToFile(
                fullHtml,
                "text/html",
                `${filename}.html`,
            );
        }
    }
}
