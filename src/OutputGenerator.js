export class OutputGenerator {
    /**
     * Download the data in the requested format
     */
    static async download(data, format, filenameBase, templatePath) {
        // 1. Create a timestamp string (e.g. "2023-10-27_14-30")
        const now = new Date();
        const dateString = now.toISOString().split("T")[0]; // YYYY-MM-DD
        const timeString = now.toTimeString().split(" ")[0].replace(/:/g, "-"); // HH-MM-SS
        const timestamp = `${dateString}_${timeString}`;

        // 2. Append timestamp to filename
        // Result: "Filroden_Sheet_2023-10-27_14-30"
        const cleanName = filenameBase.replace(/\s+/g, "_");
        const filename = `${cleanName}_Sheet_${timestamp}`;

        if (format === "json") {
            foundry.utils.saveDataToFile(
                JSON.stringify(data, null, 2),
                "text/json",
                `${filename}.json`,
            );
        } else if (format === "html") {
            const html = await foundry.applications.handlebars.renderTemplate(
                templatePath,
                data,
            );

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
