export class OutputGenerator {
    /**
     * Generates the full HTML string for the character sheet.
     * This can be used for both downloading and previewing.
     * * @param {Object} data - The prepared actor data object
     * @param {string} templatePath - Path to the HBS template to render
     * @returns {Promise<string>} The complete HTML document string
     */
    static async generateHTML(data, templatePath) {
        // Render the body content using Foundry's Handlebars helper
        const htmlContent =
            await foundry.applications.handlebars.renderTemplate(
                templatePath,
                data,
            );

        // Wrap it in a standard HTML5 skeleton
        // We add some basic print styles here to ensure the preview looks right
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>${data.header?.name || "Character Sheet"}</title>
                <style>
                    body { 
                        background: white; 
                        padding: 20px;
                        margin: 0;
                        font-family: 'Segoe UI', sans-serif;
                    }
                    /* Ensure print media queries work in preview if possible */
                    @media print {
                        body { padding: 0; }
                    }
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
     */
    static async download(data, format, filenameBase, templatePath) {
        // 1. Create a timestamp string
        const now = new Date();
        const dateString = now.toISOString().split("T")[0];
        const timeString = now.toTimeString().split(" ")[0].replace(/:/g, "-");
        const timestamp = `${dateString}_${timeString}`;

        const cleanName = filenameBase.replace(/\s+/g, "_");
        const filename = `${cleanName}_Sheet_${timestamp}`;

        if (format === "json") {
            foundry.utils.saveDataToFile(
                JSON.stringify(data, null, 2),
                "text/json",
                `${filename}.json`,
            );
        } else if (format === "html") {
            // 2. Generate the HTML using our new helper
            const fullHtml = await this.generateHTML(data, templatePath);

            // 3. Save as file
            const blob = new Blob([fullHtml], { type: "text/html" });
            foundry.utils.saveDataToFile(blob, "text/html", `${filename}.html`);
        }
    }
}
