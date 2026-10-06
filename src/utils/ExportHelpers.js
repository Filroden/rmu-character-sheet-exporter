/**
 * Shared formatting, localisation and serialisation helpers used by the extractors and the
 * output generator.
 */

// Pace entry whose per-round rate is the Base Movement Rate (BMR).
const BMR_PACE = "Walk";

// Metric conversion factors.
const KG_PER_POUND = 0.5;
const METRES_PER_FOOT = 0.3048;

export class ExportHelpers {
    /* -------------------------------------------- */
    /* Localisation                                 */
    /* -------------------------------------------- */

    /**
     * Localises a key, returning the fallback when the key has no translation.
     * game.i18n.localize returns the key itself (never an empty string) when a translation is
     * missing, so the key must be tested with game.i18n.has rather than with a falsy check.
     * @param {string} key - The localisation key.
     * @param {string} [fallback=key] - Text to return when the key is not translated.
     * @returns {string}
     */
    static i18n(key, fallback = key) {
        return game.i18n.has(key) ? game.i18n.localize(key) : fallback;
    }

    /**
     * Formats a localisation key with data, returning the fallback when the key is missing.
     * @param {string} key - The localisation key.
     * @param {Object} data - Values substituted into the translated string.
     * @param {string} fallback - Text to return when the key is not translated.
     * @returns {string}
     */
    static format(key, data, fallback) {
        return game.i18n.has(key) ? game.i18n.format(key, data) : fallback;
    }

    /**
     * Localises a raw system value using a key prefix (e.g. "RMU.Skills" + "Perception"),
     * falling back to the raw value. Unlike safeLocalize, the raw value is never treated as a
     * key on its own, which avoids accidental matches for short values.
     * @param {string} prefix - The localisation key prefix.
     * @param {string} value - The raw value.
     * @returns {string}
     */
    static localizeWithPrefix(prefix, value) {
        if (!value) return "";
        return this.i18n(`${prefix}.${value}`, value);
    }

    /**
     * Localises a value that may either be a full localisation key or a raw value that needs
     * a prefix, falling back to the raw value.
     * @param {string} val - The value or key.
     * @param {string} [prefix=""] - Optional key prefix to try second.
     * @returns {string}
     */
    static safeLocalize(val, prefix = "") {
        if (!val) return "";
        if (game.i18n.has(val)) return game.i18n.localize(val);
        if (prefix && game.i18n.has(`${prefix}.${val}`)) return game.i18n.localize(`${prefix}.${val}`);
        return val;
    }

    /* -------------------------------------------- */
    /* Numbers and units                            */
    /* -------------------------------------------- */

    static formatBonus(val) {
        if (val === null || val === undefined) return 0;
        return val > 0 ? `+${val}` : val;
    }

    static get isMetric() {
        return game.settings.get("rmu", "measurementSystem") === "Metric";
    }

    /**
     * Formats a weight in pounds for display, converting to metric when the system uses it.
     * @param {number} pounds - Weight in pounds.
     * @returns {string}
     */
    static formatWeight(pounds) {
        if (this.isMetric) return this.toMetricWeight(pounds);
        return this.format("RMU_EXPORT.Units.Pounds", { value: pounds }, `${pounds} lbs`);
    }

    /**
     * Formats a cost in silver pieces for display.
     * @param {number} silver - Cost in silver pieces.
     * @returns {string}
     */
    static formatCost(silver) {
        return this.format("RMU_EXPORT.Units.Silver", { value: silver }, `${silver} sp`);
    }

    /**
     * Formats a movement rate in feet per round, converting to metric when the system uses it.
     * @param {number} feet - Distance in feet per round.
     * @returns {string}
     */
    static formatPerRound(feet) {
        if (this.isMetric) {
            const metres = this.toMetricMovement(feet);
            return this.format("RMU_EXPORT.Units.PerRound", { value: metres }, `${metres}/rd`);
        }
        return this.format("RMU_EXPORT.Units.FeetPerRound", { value: feet }, `${feet}'/rd`);
    }

    /**
     * Returns the Base Movement Rate (the per-round rate of the Walk pace) from one movement
     * mode table prepared by the system.
     * @param {Object|undefined} modeTable - An entry from system._movementBlock._table.
     * @returns {number}
     */
    static getWalkRate(modeTable) {
        const paceRates = modeTable?.paceRates;
        if (!Array.isArray(paceRates)) return 0;
        const walkEntry = paceRates.find((p) => p.pace?.value === BMR_PACE);
        return walkEntry?.perRound || 0;
    }

    static toMetricWeight(pounds) {
        const kg = pounds * KG_PER_POUND;
        let rd = 10;
        let digits = 1;
        let roundedKilograms;
        if (kg >= 0.1 && kg <= 0.5) {
            roundedKilograms = (Math.floor((kg * 1000) / 50) * 50) / 1000;
            digits = 2;
        } else if (kg < 0.1) {
            roundedKilograms = (Math.floor((kg * 1000) / 10) * 10) / 1000;
            digits = 2;
        } else {
            roundedKilograms = Math.floor(kg * rd) / rd;
        }
        return roundedKilograms.toLocaleString(undefined, { style: "decimal", minimumFractionDigits: 0, maximumFractionDigits: digits, useGrouping: false }) + " kg";
    }

    static toMetricMovement(feet) {
        const metersExact = feet * METRES_PER_FOOT;
        const rd = metersExact < 4 ? 100 : 2;
        if (rd > 2) {
            const meters = Math.floor(metersExact * 25) / 25;
            return meters.toLocaleString(undefined, { style: "decimal", minimumFractionDigits: 0, maximumFractionDigits: 1, useGrouping: false }) + " m";
        }
        const meters = Math.floor(metersExact * rd) / rd;
        return meters.toLocaleString(undefined, { style: "decimal", minimumFractionDigits: 0, maximumFractionDigits: 1, useGrouping: false }) + " m";
    }

    static toMetricReach(feet) {
        const meters = feet * METRES_PER_FOOT;
        return meters.toLocaleString(undefined, { style: "decimal", minimumFractionDigits: 0, maximumFractionDigits: 1, useGrouping: false }) + " m";
    }

    static toMetricRange(feet) {
        const meters = Math.round(feet * METRES_PER_FOOT);
        return meters + " m";
    }

    static toMetricHeight(feet) {
        const meters = feet * METRES_PER_FOOT;
        return meters.toLocaleString(undefined, { style: "decimal", minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false }) + " m";
    }

    static parseHeightString(str) {
        if (!str) return 0;
        const match = str.match(/(\d+)'\s*(?:(\d+)")?/);
        if (match) {
            const feet = Number.parseInt(match[1]) || 0;
            const inches = Number.parseInt(match[2]) || 0;
            return feet + inches / 12;
        }
        return Number.parseFloat(str) || 0;
    }

    static parseWeightString(str) {
        if (!str) return 0;
        const clean = str.replaceAll(/[^\d.]/g, "");
        return Number.parseFloat(clean) || 0;
    }

    /* -------------------------------------------- */
    /* HTML output                                  */
    /* -------------------------------------------- */

    /**
     * Escapes text for safe use inside HTML markup (e.g. the document title).
     * Uses the Handlebars escaper that Foundry already ships, so the rules match the templates.
     * @param {string} text - The raw text.
     * @returns {string}
     */
    static escapeHTML(text) {
        return Handlebars.escapeExpression(text ?? "");
    }

    /**
     * Serialises data as JSON that is safe to embed inside a <script> element.
     * Every "<" is written as its JSON unicode escape so that text such as "</script>" inside
     * a biography cannot close the element early. JSON.parse restores the original characters,
     * so the import is unaffected.
     * @param {*} data - The data to serialise.
     * @returns {string}
     */
    static toEmbeddedJSON(data) {
        return JSON.stringify(data).replaceAll("<", "\\u003c");
    }

    static async imageToBase64(url) {
        if (!url || url === "icons/svg/mystery-man.svg") return null;
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.warn("RMU Export | Failed to load image:", url, e);
            return null;
        }
    }
}
