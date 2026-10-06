import { ExportHelpers } from "./utils/ExportHelpers.js";
import { CAPSULE_FORMAT, MODULE_ID } from "./ExportConfig.js";
import { extractHeader } from "./extractors/HeaderExtractor.js";
import { extractDetails } from "./extractors/DetailsExtractor.js";
import { extractBiography } from "./extractors/BiographyExtractor.js";
import { extractQuickInfo } from "./extractors/QuickInfoExtractor.js";
import { extractStats } from "./extractors/StatsExtractor.js";
import { extractResistances } from "./extractors/ResistancesExtractor.js";
import { extractDefenses } from "./extractors/DefensesExtractor.js";
import { extractMovement } from "./extractors/MovementExtractor.js";
import { extractTalents } from "./extractors/TalentsExtractor.js";
import { extractSkills } from "./extractors/SkillsExtractor.js";
import { extractConditions } from "./extractors/ConditionsExtractor.js";
import { extractSpells } from "./extractors/SpellsExtractor.js";
import { extractAttacks } from "./extractors/AttacksExtractor.js";
import { extractInventory } from "./extractors/InventoryExtractor.js";
import { extractTrainingPackages } from "./extractors/TrainingPackagesExtractor.js";
import { extractFightingStyles } from "./extractors/FightingStylesExtractor.js";

export class DataExtractor {
    /**
     * Makes sure the system has prepared the actor's derived data (attacks, defensive options,
     * movement tables and so on) before it is read.
     * The RMU system derives this data through the actor's token, which is why the export
     * button requires the actor to have a token on the scene. If no token document offers the
     * derivation method, the actor's own data preparation is used instead.
     * @param {Actor} actor - The actor being exported.
     * @returns {Promise<Actor|null>} The actor holding the derived data, or null on failure.
     */
    static async ensureExtendedData(actor) {
        if (actor.system?._hudInitialized) return actor;

        const tokenDoc = actor.token ?? actor.getActiveTokens?.()[0]?.document ?? null;
        if (typeof tokenDoc?.hudDeriveExtendedData === "function") {
            try {
                await tokenDoc.hudDeriveExtendedData();
                const finalActor = tokenDoc.actor || actor;
                // The dodge and block option lists live on the token document, not the actor,
                // so they are cached on the actor for the defences extractor.
                finalActor._cachedDodge = tokenDoc.dodgeOptions;
                finalActor._cachedBlock = tokenDoc.blockOptions;
                return finalActor;
            } catch (e) {
                console.warn("RMU Export | HUD derivation crashed:", e);
            }
        }

        try {
            actor.prepareData?.();
            return actor;
        } catch (e) {
            console.warn("RMU Export | Data preparation failed:", e);
            return null;
        }
    }

    static async getCleanData(targetActor, options = {}) {
        if (!targetActor) return {};

        const {
            showAllSkills = false,
            header = true,
            portrait = true,
            details = true,
            biography = true,
            quick_info = true,
            stats = true,
            defenses = true,
            attacks = true,
            movement = true,
            skills = true,
            training_packages = true,
            fighting_styles = true,
            spells = true,
            inventory = true,
            talents = true,
            conditions = false,
        } = options;

        let portraitData = null;
        if (portrait) {
            portraitData = await ExportHelpers.imageToBase64(targetActor.img);
        }

        // toObject() returns only the stored document data (no derived values), which is
        // exactly what an import needs. Item ids must be kept: fighting style and ability
        // items refer to their skill item by id, so stripping ids would break those links.
        const rawFoundryData = ExportHelpers.toEmbeddedJSON(targetActor.toObject());

        return {
            options: {
                header,
                portrait,
                details,
                biography,
                quick_info,
                stats,
                defenses,
                attacks,
                movement,
                skills,
                training_packages,
                fighting_styles,
                spells,
                inventory,
                talents,
                conditions,
            },
            portrait_data: portraitData,
            raw_foundry_data: rawFoundryData,
            header_data: header ? extractHeader(targetActor) : null,
            details_data: details ? extractDetails(targetActor) : null,
            biography_data: biography ? extractBiography(targetActor) : null,
            quick_info_data: quick_info ? extractQuickInfo(targetActor) : null,
            stats_data: stats ? extractStats(targetActor) : null,
            resistances_data: stats ? extractResistances(targetActor) : null,
            defenses_data: defenses ? extractDefenses(targetActor) : null,
            movement_data: movement ? extractMovement(targetActor) : null,
            talents_data: talents ? extractTalents(targetActor) : null,
            skill_groups_data: skills ? extractSkills(targetActor, { showAllSkills }) : [],
            training_packages_data: training_packages ? extractTrainingPackages(targetActor) : [],
            fighting_styles_data: fighting_styles ? extractFightingStyles(targetActor) : [],
            attacks_data: attacks ? extractAttacks(targetActor) : null,
            spells_data: spells ? extractSpells(targetActor) : [],
            inventory_data: inventory ? extractInventory(targetActor) : null,
            conditions_data: conditions ? extractConditions(targetActor) : null,

            meta: {
                timestamp: new Date().toLocaleString(),
                systemId: game.system.id,
                systemVersion: game.system.version,
                coreVersion: game.version,
                capsuleFormat: CAPSULE_FORMAT,
                moduleVersion: game.modules.get(MODULE_ID)?.version || ExportHelpers.i18n("RMU_EXPORT.Common.Unknown", "Unknown"),
            },
        };
    }
}
