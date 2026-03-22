export class ExportHelpers {
    static formatBonus(val) {
        if (val === null || val === undefined) return 0;
        return val > 0 ? `+${val}` : val;
    }

    static i18n(key, fallback = "") {
        return game.i18n.localize(key) || fallback;
    }

    static safeLocalize(val, prefix = "") {
        if (!val) return "";
        if (game.i18n.has(val)) return game.i18n.localize(val);
        if (prefix && game.i18n.has(`${prefix}.${val}`)) return game.i18n.localize(`${prefix}.${val}`);
        return val;
    }

    static get isMetric() {
        return game.settings.get("rmu", "measurementSystem") === "Metric";
    }

    static toMetricWeight(pounds) {
        const kg = pounds * 0.5;
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
        const options = { style: "decimal", minimumFractionDigits: 0, maximumFractionDigits: digits, useGrouping: false };
        return roundedKilograms.toLocaleString(undefined, options) + " kg";
    }

    static toMetricMovement(feet) {
        const metersExact = feet * 0.3048;
        const rd = metersExact < 4 ? 100 : 2;
        if (rd > 2) {
            const meters = Math.floor(metersExact * 25) / 25;
            return meters.toLocaleString(undefined, { style: "decimal", minimumFractionDigits: 0, maximumFractionDigits: 1, useGrouping: false }) + " m";
        }
        const meters = Math.floor(metersExact * rd) / rd;
        return meters.toLocaleString(undefined, { style: "decimal", minimumFractionDigits: 0, maximumFractionDigits: 1, useGrouping: false }) + " m";
    }

    static toMetricReach(feet) {
        const meters = feet * 0.3048;
        return meters.toLocaleString(undefined, { style: "decimal", minimumFractionDigits: 0, maximumFractionDigits: 1, useGrouping: false }) + " m";
    }

    static toMetricRange(feet) {
        const meters = Math.round(feet * 0.3048);
        return meters + " m";
    }

    static toMetricHeight(feet) {
        const meters = feet * 0.3048;
        return meters.toLocaleString(undefined, { style: "decimal", minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false }) + " m";
    }

    static parseHeightString(str) {
        if (!str) return 0;
        const match = str.match(/(\d+)'\s*(?:(\d+)")?/);
        if (match) {
            const feet = parseInt(match[1]) || 0;
            const inches = parseInt(match[2]) || 0;
            return feet + inches / 12;
        }
        return parseFloat(str) || 0;
    }

    static parseWeightString(str) {
        if (!str) return 0;
        const clean = str.replace(/[^\d.]/g, "");
        return parseFloat(clean) || 0;
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

    static cleanObject(obj) {
        if (typeof obj !== "object" || obj === null) return obj;
        if (Array.isArray(obj)) {
            return obj.map((item) => this.cleanObject(item));
        }
        const cleaned = {};
        for (const key in obj) {
            if (key.startsWith("_")) continue;
            cleaned[key] = this.cleanObject(obj[key]);
        }
        return cleaned;
    }
}
