import { ExportHelpers } from "../utils/ExportHelpers.js";

export function extractDetails(actor) {
    const sys = actor.system;
    const app = sys.appearance || {};
    const id = sys.identity || {};
    const player = sys.player || {};
    const encounter = sys.encounter || {};

    let heightDisplay = app._height || "";
    let weightDisplay = app._weight || "";

    if (ExportHelpers.isMetric) {
        const feet = ExportHelpers._parseHeightString(app._height);
        if (feet > 0) heightDisplay = ExportHelpers._toMetricHeight(feet);

        const lbs = ExportHelpers._parseWeightString(app._weight);
        if (lbs > 0) weightDisplay = ExportHelpers._toMetricWeight(lbs);
    }

    // Apply localization
    const powerLevelDisplay = ExportHelpers._safeLocalize(sys.powerLevel, "RMU.Setting.PlayerPowerLevel");
    const sexDisplay = ExportHelpers._safeLocalize(app.sex, "RMU.Terms");

    const compactPlayer = [];
    if (player.name) compactPlayer.push(player.name);
    if (player.campaign) compactPlayer.push(player.campaign);
    if (powerLevelDisplay) compactPlayer.push(powerLevelDisplay);

    const compactApp = [];
    const pushApp = (key, val) => {
        if (val) compactApp.push(`${ExportHelpers._i18n(key)}: ${val}`);
    };
    pushApp("RMU_EXPORT.Bio.Age", app.age);
    pushApp("RMU_EXPORT.Bio.Height", heightDisplay);
    pushApp("RMU_EXPORT.Bio.Weight", weightDisplay);
    pushApp("RMU_EXPORT.Bio.Eyes", app.eyes);
    pushApp("RMU_EXPORT.Bio.Hair", app.hair);

    return {
        player_name: player.name || "",
        campaign: player.campaign || "",
        power_level: powerLevelDisplay,

        age: app.age || "",
        eyes: app.eyes || "",
        hair: app.hair || "",
        height: heightDisplay,
        weight: weightDisplay,
        sex: sexDisplay,
        skin: app.skin || "",

        faith: id.faith || "",
        gender: id.gender || "",

        outlook: sys.creatureOutlook || "",
        encounter_number: encounter.number || "",
        encounter_frequency: encounter.frequency || "",
        treasure: sys.treasure || "",
        biome: sys.biome || "",
        size_description: app.sizeDescription || "",
        armor_description: app.armorDescription || "",

        compact_player: compactPlayer,
        compact_appearance: compactApp,
    };
}
