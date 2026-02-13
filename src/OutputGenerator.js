export class OutputGenerator {
    /**
     * Generates the full HTML string for the character sheet.
     * Combines the structural Handlebars layout with the visual CSS theme.
     * * @param {Object} data - The prepared actor data object (including options)
     * @param {string} layoutPath - Path to the HBS layout template
     * @param {string} themePath - Path to the CSS theme file
     * @returns {Promise<string>} The complete HTML document string
     */
    static async generateHTML(data, layoutPath, themePath) {
        // 1. Render the HTML Layout (Structure)
        // We use Foundry's helper to render the handlebars template with our data
        const htmlContent =
            await foundry.applications.handlebars.renderTemplate(
                layoutPath,
                data,
            );

        // 2. Fetch the CSS Theme (Aesthetics)
        // We fetch this as text so we can embed it directly into the HTML file.
        // This makes the export "portable" (works offline).
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

        // 3. Assemble the Final Document
        // We wrap the layout in a standard HTML5 skeleton and inject the CSS.
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>${data.header?.name || "Character Sheet"}</title>
                <style>
                    /* --- BASE RESET & UTILITIES --- */
                    body { 
                        margin: 0;
                        padding: 0;
                        background-color: #525252;
                        font-family: 'Segoe UI', sans-serif;
                        display: flex;
                        justify-content: center;
                        min-height: 100vh;
                    }

                    /* --- PRINT RESET --- */
                    @media print {
                        body { 
                            background: none; 
                            display: block; 
                            height: auto;
                            /* Force browsers to print background colors/images */
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                    }

                    /* --- INJECTED THEME CSS --- */
                    ${cssContent}
                </style>
            </head>
            <body>
                ${htmlContent}
            </body>
            </html>
        `;
    }

    /**
     * Download the data in the requested format
     * @param {Object} data - The prepared actor data
     * @param {string} format - "json" or "html"
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
            foundry.utils.saveDataToFile(
                JSON.stringify(data, null, 2),
                "text/json",
                `${filename}.json`,
            );
        } else if (format === "html") {
            // 2. Generate the HTML using our new method that combines Layout + CSS
            const fullHtml = await this.generateHTML(
                data,
                layoutPath,
                themePath,
            );

            // 3. Save as file
            const blob = new Blob([fullHtml], { type: "text/html" });
            foundry.utils.saveDataToFile(blob, "text/html", `${filename}.html`);
        }
    }
}
