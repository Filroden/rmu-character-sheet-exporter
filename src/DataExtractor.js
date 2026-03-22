import { ExportHelpers } from "./utils/ExportHelpers.js";
import { extractHeader } from "./extractors/HeaderExtractor.js";
import { extractDetails } from "./extractors/DetailsExtractor.js";
import { extractBiography } from "./extractors/BiographyExtractor.js";
import { extractQuickInfo } from "./extractors/QuickInfoExtractors.js";
import { extractStats } from "./extractors/StatsExtractors.js";
import { extractResistances } from "./extractors/ResistancesExtractor.js";
import { extractDefenses } from "./extractors/DefensesExtractor.js";
import { extractMovement } from "./extractors/MovementExtractor.js";
import { extractTalents } from "./extractors/TalentsExtractor.js";
import { extractSkills } from "./extractors/SkillsExtractor.js";
import { extractConditions } from "./extractors/ConditionsExtractor.js";
import { extractSpells } from "./extractors/SpellsExtractor.js";
import { extractAttacks } from "./extractors/AttacksExtractor.js";
import { extractInventory } from "./extractors/InventoryExtractor.js";

export class DataExtractor {
    static async ensureExtendedData(actor) {
        if (actor.system?._hudInitialized) return actor;
        let targetDoc = null;
        if (actor.token) {
            targetDoc = actor.token;
        } else if (actor.getActiveTokens) {
            const tokens = actor.getActiveTokens();
            if (tokens.length > 0) targetDoc = tokens[0].document;
        }
        if (!targetDoc) {
            try {
                const tokenData = actor.prototypeToken.toObject();
                tokenData.actorId = actor.id;
                tokenData.actorLink = true;
                targetDoc = new TokenDocument(tokenData, {
                    parent: canvas?.scene || null,
                });
                if (!targetDoc.actor) targetDoc._actor = actor;
            } catch (e) {
                console.warn("RMU Export | Failed to create dummy token:", e);
            }
        }
        if (targetDoc && typeof targetDoc.hudDeriveExtendedData === "function") {
            try {
                await targetDoc.hudDeriveExtendedData();
                const finalActor = targetDoc.actor || actor;
                finalActor._cachedDodge = targetDoc.dodgeOptions;
                finalActor._cachedBlock = targetDoc.blockOptions;
                return finalActor;
            } catch (e) {
                console.warn("RMU Export | HUD derivation crashed:", e);
            }
        }
        try {
            if (actor.prepareData) actor.prepareData();
            return actor;
        } catch (e) {
            return null;
        }
    }

    static async getCleanData(targetActor, options = {}) {
        if (!targetActor) return {};

        const sys = targetActor.system;
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
            spells = true,
            inventory = true,
            talents = true,
            conditions = false,
        } = options;

        let portraitData = null;
        if (portrait) {
            portraitData = await ExportHelpers.imageToBase64(targetActor.img);
        }

        const rawObj = targetActor.toObject();
        const cleanObj = ExportHelpers.cleanObject(rawObj);
        const rawFoundryData = JSON.stringify(cleanObj);

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
            attacks_data: attacks ? extractAttacks(targetActor) : null,
            spells_data: spells ? extractSpells(targetActor) : [],
            inventory_data: inventory ? extractInventory(targetActor) : null,
            conditions_data: conditions ? extractConditions(targetActor) : null,

            meta: {
                timestamp: new Date().toLocaleString(),
                systemVersion: game.system.version,
                moduleVersion: game.modules.get("rmu-character-sheet-exporter")?.version || "Unknown",
            },
        };
    }
}
