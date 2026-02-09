export class OutputGenerator {
    /**
     * Download the data in the requested format
     */
    static async download(data, format, filenameBase) {
        const filename = `${filenameBase.replace(/\s+/g, "_")}_Sheet`;

        if (format === "json") {
            foundry.utils.saveDataToFile(
                JSON.stringify(data, null, 2),
                "text/json",
                `${filename}.json`,
            );
        } else if (format === "html") {
            const html = await foundry.applications.handlebars.renderTemplate(
                "modules/rmu-character-sheet-exporter/templates/character_sheet.hbs",
                data,
            );

            // Wrap in a basic HTML structure so it opens nicely in Word
            const fullHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>${filenameBase}</title>
                </head>
                <body style="background: white; padding: 20px;">
                    ${html}
                </body>
                </html>
            `;
            const blob = new Blob([fullHtml], { type: "text/html" });
            foundry.utils.saveDataToFile(blob, "text/html", `${filename}.html`);
        }
    }
}
