export class DataExtractor {
    /**
     * -----------------------------------------------------------
     * FORMATTING HELPERS
     * -----------------------------------------------------------
     */

    /**
     * Formats a number to include a sign (e.g., 10 -> "+10", -5 -> "-5", 0 -> "0").
     * Used for OBs, DBs, Stat Bonuses, and Skill Totals.
     * @param {number} val - The numeric value to format.
     * @returns {string|number} - The formatted string or 0.
     */
    static _formatBonus(val) {
        if (val === null || val === undefined) return 0;
        return val > 0 ? `+${val}` : val;
    }

    /**
     * -----------------------------------------------------------
     * DATA PREPARATION
     * -----------------------------------------------------------
     */

    /**
     * Ensures that the Actor has all derived data calculated before export.
     *
     * RMU calculates complex data (like total skill bonuses and attack OBs) lazily
     * or specifically for the Token HUD. This method forces those calculations.
     *
     * @param {Actor} actor - The actor to prepare.
     * @returns {Promise<Actor|null>} - The prepared actor (or token actor) with data ready.
     */
    static async ensureExtendedData(actor) {
        // If the system says it's already initialized, we don't need to do anything.
        if (actor.system?._hudInitialized) return actor;

        let targetDoc = null;

        // Step 1: Find a valid Token Document to run the calculations on.
        // The HUD calculation method (hudDeriveExtendedData) is defined on the Token, not the Actor.

        // Case A: The actor is already a Token Actor (e.g. opened from the canvas).
        if (actor.token) {
            targetDoc = actor.token;
        }
        // Case B: It's a sidebar Actor, but it has tokens on the current scene.
        else if (actor.getActiveTokens) {
            const tokens = actor.getActiveTokens();
            if (tokens.length > 0) targetDoc = tokens[0].document;
        }

        // Case C: No token exists. We must create a temporary "dummy" token in memory
        // to trick the system into running the calculation logic.
        if (!targetDoc) {
            try {
                const tokenData = actor.prototypeToken.toObject();
                tokenData.actorId = actor.id;
                tokenData.actorLink = true;
                targetDoc = new TokenDocument(tokenData, {
                    parent: canvas?.scene || null,
                });
                // Link the dummy token back to the real actor
                if (!targetDoc.actor) targetDoc._actor = actor;
            } catch (e) {
                console.warn("RMU Export | Failed to create dummy token:", e);
            }
        }

        // Step 2: Execute the System's Calculation Method
        if (
            targetDoc &&
            typeof targetDoc.hudDeriveExtendedData === "function"
        ) {
            try {
                // 1. Initialize Skills, Attacks, and Spells.
                // This populates actor.system._skills, _attacks, etc.
                await targetDoc.hudDeriveExtendedData();

                // 2. FORCE CALCULATE DEFENSES.
                // The defensive options (Dodge/Block) are lazy getters.
                // We must explicitly access them on the TOKEN now that skills are ready
                // to force the system to compute the values.
                const finalActor = targetDoc.actor || actor;

                // Cache them on the actor so _getDefenses can find them later.
                finalActor._cachedDodge = targetDoc.dodgeOptions;
                finalActor._cachedBlock = targetDoc.blockOptions;

                return finalActor;
            } catch (e) {
                console.warn("RMU Export | HUD derivation crashed:", e);
            }
        }

        // Fallback: Standard Foundry data preparation if the HUD method fails/doesn't exist.
        try {
            if (actor.prepareData) actor.prepareData();
            return actor;
        } catch (e) {
            return null;
        }
    }

    /**
     * -----------------------------------------------------------
     * MAIN EXTRACTOR
     * -----------------------------------------------------------
     */

    /**
     * Main entry point. Gathers all data sections into a clean object for the template.
     * @param {Actor} targetActor - The source actor.
     * @param {Object} options - User options (e.g. { showAllSkills: boolean }).
     */
    static getCleanData(targetActor, options = {}) {
        if (!targetActor) return {};

        const sys = targetActor.system;
        const { showAllSkills = false, showSpells = true } = options;

        return {
            header: this._getHeader(targetActor),
            quick_info: this._getQuickInfo(sys),
            stats: this._getStats(sys),
            resistances: this._getResistances(sys),
            defenses: this._getDefenses(sys, targetActor), // Passes actor to access cached tokens
            attacks: this._getAttacks(targetActor),
            talents: this._getTalents(targetActor),
            skill_groups: this._getSkills(targetActor, { showAllSkills }),
            spells: showSpells ? this._getSpells(targetActor) : [],
            inventory: this._getInventory(targetActor),
            meta: {
                timestamp: new Date().toLocaleString(),
                systemVersion: game.system.version,
                moduleVersion:
                    game.modules.get("rmu-character-sheet-exporter")?.version ||
                    "Unknown",
            },
        };
    }

    /**
     * -----------------------------------------------------------
     * SUB-SECTIONS
     * -----------------------------------------------------------
     */

    static _getHeader(actor) {
        const sys = actor.system;
        const getItemName = (type) =>
            actor.items.find((i) => i.type === type)?.name || "Unknown";

        return {
            name: actor.name,
            race: getItemName("race"),
            culture: getItemName("culture"),
            profession: getItemName("profession"),
            level: sys.experience?.level ?? 1,
            realm: sys.realm || "None",
            size: sys.appearance?.size || "Unknown",
        };
    }

    static _getQuickInfo(sys) {
        // --- MOVEMENT ---
        let bmr = 0;
        const mode = sys.activeMovementName || "Running";
        const moveData = sys._movementBlock || {};
        const modeTable = moveData._table?.[mode];

        if (modeTable?.paceRates) {
            const walkEntry = modeTable.paceRates.find(
                (p) => p.pace?.value === "Walk",
            );
            bmr = walkEntry?.perRound || 0;
        }

        // --- INITIATIVE ---
        const init = sys._totalInitiativeBonus || 0;

        // --- ENDURANCE ---
        const pEnc = sys._injuryBlock._endurance._bonusWithRacial ?? 0;
        const mEnc = sys._injuryBlock._concentration._bonusWithRacial ?? 0;

        return {
            bmr_value: `${bmr}'/rd`,
            bmr_mode: mode,
            // Refactored to use helper
            initiative: this._formatBonus(init),
            hits: {
                current: sys.health?.hp?.value ?? 0,
                max: sys.health?.hp?.max ?? 0,
            },
            // Refactored to use helper
            endurance_physical: this._formatBonus(pEnc),
            endurance_mental: this._formatBonus(mEnc),
            power: {
                current: sys.health?.power?.value ?? 0,
                max: sys.health?.power?.max ?? 0,
            },
        };
    }

    static _getStats(sys) {
        const statKeys = [
            "Ag",
            "Co",
            "Em",
            "In",
            "Me",
            "Pr",
            "Qu",
            "Re",
            "SD",
            "St",
        ];
        const stats = [];
        const sourceBlock = sys._statBlock || {};

        for (const key of statKeys) {
            const data = sourceBlock[key];
            if (!data) continue;

            stats.push({
                label: key,
                // Refactored to use helper
                bonus: this._formatBonus(data.total ?? 0),
            });
        }

        return stats;
    }

    static _getResistances(sys) {
        // Based on RMUData: The path differs between versions/items.
        const block = sys._resistanceBlock || sys.resistanceBlock || {};
        const list =
            block._resistances ||
            block.resistances ||
            sys._resistances ||
            sys.resistances ||
            [];

        const findRes = (name) => {
            const r = list.find((x) =>
                x.name.toLowerCase().includes(name.toLowerCase()),
            );
            return r ? (r.total ?? r.bonus ?? 0) : 0;
        };

        // Refactored to use helper for all resistance bonuses
        return [
            {
                label: "Channeling",
                bonus: this._formatBonus(findRes("Channeling")),
            },
            { label: "Essence", bonus: this._formatBonus(findRes("Essence")) },
            {
                label: "Mentalism",
                bonus: this._formatBonus(findRes("Mentalism")),
            },
            {
                label: "Physical",
                bonus: this._formatBonus(findRes("Physical")),
            },
            { label: "Fear", bonus: this._formatBonus(findRes("Fear")) },
        ];
    }

    static _getDefenses(sys, actor) {
        const dbBlock = sys._dbBlock || {};

        // 1. Extract Base Components
        const quDb = dbBlock.quicknessDB ?? 0;
        const armorDb = dbBlock.armorDB ?? 0;
        const otherDb = sys.defense?.other ?? 0;
        const shieldBonus = sys.defenses?.shield?.bonus || 0;

        // Static DB applicable to all modes (Passive/Partial/Full)
        const baseTotal = quDb + armorDb + otherDb;

        // 2. Get Options (with fallback to the cached values from ensureExtendedData)
        let dodgeOpts = dbBlock.dodgeOptions;
        let blockOpts = dbBlock.blockOptions;

        if (!dodgeOpts && actor._cachedDodge) dodgeOpts = actor._cachedDodge;
        if (!blockOpts && actor._cachedBlock) blockOpts = actor._cachedBlock;

        dodgeOpts = dodgeOpts || [];
        blockOpts = blockOpts || [];

        // Helper: Extract modifier from option object { value: "x", modifier: 10 }
        const getModifier = (opts, modeValue) => {
            if (!Array.isArray(opts)) return 0;
            const found = opts.find((o) => o.value === modeValue);
            return found ? (found.modifier ?? 0) : 0;
        };

        // 3. Pre-fetch Passive Modifiers
        // We need these because RMU rules state:
        // "Active defenses (Full/Partial) also benefit from the PASSIVE bonus of the OTHER defense type."
        const passiveDodgeMod = getModifier(dodgeOpts, "passive");
        const passiveBlockMod = getModifier(blockOpts, "passive");

        // 4. Build Row Data with Cross-Adding Logic
        const buildMode = (label, modeKey) => {
            const currentDodgeMod = getModifier(dodgeOpts, modeKey);
            const currentBlockMod = getModifier(blockOpts, modeKey);

            // Start with Base + Current Mode Modifier
            let totalDodge = baseTotal + currentDodgeMod;
            let totalBlock = baseTotal + currentBlockMod + shieldBonus;

            // CROSS-ADD RULE: If Partial or Full, add the Passive modifier from the OTHER defense type.
            if (modeKey !== "passive") {
                totalDodge += passiveBlockMod;
                totalBlock += passiveDodgeMod;
            }

            return {
                mode: label,
                dodge: this._formatBonus(totalDodge),
                block: this._formatBonus(totalBlock),
            };
        };

        const armorData = sys._armorWorn || {};
        const getArmorInfo = (loc) => {
            const part = armorData[loc];
            if (!part) return { name: "Unknown", at: 0 };
            return {
                name: part.piece?._base?.material || "Unknown",
                at: part.AT ?? 0,
            };
        };

        // Refactored to use helper for summary stats
        return {
            quickness_bonus: this._formatBonus(quDb),
            armor_db: this._formatBonus(armorDb),
            other_db: this._formatBonus(otherDb),
            total_db_current: this._formatBonus(dbBlock.totalDB ?? 0),
            tactical: [
                buildMode("Passive", "passive"),
                buildMode("Partial", "partial"),
                buildMode("Full", "full"),
            ],
            armor: {
                head: getArmorInfo("Head"),
                torso: getArmorInfo("Torso"),
                arms: getArmorInfo("Arms"),
                legs: getArmorInfo("Legs"),
            },
        };
    }

    static _getAttacks(actor) {
        const attacks = actor.system._attacks || [];

        return attacks.map((a) => {
            // 1. Reach Logic
            let reachDisplay = "";
            if (a.meleeRange) {
                reachDisplay = `${a.meleeRange}'`;
            }

            // 2. Range Logic
            let rangeDisplay = "";
            if (a.isRanged) {
                const shortRange = a.usage?.range?.short;
                if (shortRange) {
                    rangeDisplay = `<${shortRange}>`;
                }
            }

            return {
                name: a.attackName || "Unknown Weapon",
                specialization: a.specialization || "Unknown",
                handed: a.handed || "",
                // Refactored to use helper
                ob: this._formatBonus(a.totalBonus ?? 0),
                damageType: a.chart.name || "Unknown",
                fumble: a.fumble || 0,
                reach: reachDisplay,
                range: rangeDisplay,
            };
        });
    }

    static _getTalents(actor) {
        const talents = actor.items.filter(
            (i) => i.type === "talent" || i.type === "trait",
        );
        const grouped = {};

        talents.forEach((t) => {
            const group = t.system.category || "General";
            if (!grouped[group]) grouped[group] = [];
            grouped[group].push({
                name: t.name,
                tier: t.system.tier || "",
            });
        });

        return Object.keys(grouped)
            .sort()
            .map((key) => ({
                group: key,
                entries: grouped[key],
            }));
    }

    /**
     * Extracts skills, optionally filtering out unranked ones.
     * Handles the complex recursive structure of RMU skill trees.
     */
    static _getSkills(actor, options = {}) {
        const src = actor.system._skills;
        if (!src) return [];

        const allSkills = [];

        // Recursive helper to traverse the skill tree
        const collectSkills = (node) => {
            if (!node) return;

            // 1. Handle Array Containers (e.g. groups of skills)
            if (Array.isArray(node)) {
                node.forEach((child) => collectSkills(child));
                return;
            }

            if (typeof node === "object") {
                // 2. UNWRAPPING: Check for nested "System Data"
                // RMU Items often wrap the data in a `system` property.
                if (node.system && node.system._canDevelop === true) {
                    // We push the inner 'system' object to clean up the data for the loop below.
                    allSkills.push(node.system);
                    return;
                }

                // 3. DIRECT DATA: Check if 'node' is already the unwrapped system object
                if (node._canDevelop === true) {
                    allSkills.push(node);
                    return;
                }

                // 4. CATEGORY: If neither, it is likely a Category container. Recurse deeper.
                Object.keys(node).forEach((key) => {
                    // Optimization: Don't re-scan 'system' if we already checked it above
                    if (key !== "system") {
                        collectSkills(node[key]);
                    }
                });
            }
        };

        collectSkills(src);

        // Group by Category and Sort
        const grouped = {};
        allSkills.forEach((s) => {
            const cat = s.category || "General";
            if (!grouped[cat]) grouped[cat] = [];

            // FILTER: Apply user preference (Show All vs Ranked/Favorites)
            if (options.showAllSkills || s._totalRanks > 0 || s.favorite) {
                let finalBonus = s._bonus ?? s.bonus ?? 0;

                grouped[cat].push({
                    name: s.name,
                    specialisation: s.specialization || "",
                    ranks: s._totalRanks ?? 0,
                    // Refactored to use helper
                    bonus: this._formatBonus(finalBonus),
                });
            }
        });

        // Convert grouped object to array for Handlebars
        return Object.keys(grouped)
            .sort()
            .map((key) => ({
                category: key,
                list: grouped[key].sort((a, b) => a.name.localeCompare(b.name)),
            }));
    }

    static _getSpells(actor) {
        const rawSpells = actor.system._spells || [];
        const spellGroups = [];

        if (Array.isArray(rawSpells)) {
            rawSpells.forEach((typeGroup) => {
                const listType = typeGroup.listType;

                if (typeGroup.spellLists) {
                    typeGroup.spellLists.forEach((list) => {
                        const knownSpells = (list.spells || []).filter(
                            (s) => s.known,
                        );

                        if (knownSpells.length > 0) {
                            spellGroups.push({
                                listName: list.spellListName,
                                type: listType,
                                spells: knownSpells.map((s) => ({
                                    name: s.name,
                                    level: s.level,
                                })),
                            });
                        }
                    });
                }
            });
        }
        return spellGroups;
    }

    static _getInventory(actor) {
        const enc_penalty = actor.system._encManeuverPenalty;
        const items = actor.system._inventory;

        // Map items to a clean format
        const itemList = items.map((i) => {
            const weight = i.system.weight || i.system._weight.weight || 0;
            const qty = i.system.quantity || 1;

            return {
                name: i.item.name || i.system.name || "Unknown",
                qty: qty,
                weight: `${weight} lbs`,
            };
        });

        // Determine Max Pace label
        let maxPace = "Dash";
        if (actor.system._movementBlock?.maxPaceForLoadLabel) {
            maxPace = game.i18n.localize(
                actor.system._movementBlock.maxPaceForLoadLabel,
            );
        } else if (actor.system.encumbrance?.pace) {
            maxPace = actor.system.encumbrance.pace;
        }

        return {
            weight_allowance: `${actor.system._loadAllowed?.weight ?? 0} lbs`,
            weight_carried: `${actor.system._carriedWeight?.weight ?? 0} lbs`,
            enc_penalty: enc_penalty || 0,
            max_pace: maxPace,
            items: itemList,
        };
    }
}
