export class DataExtractor {
    /**
     * Triggers the system's calculation of derived data
     * (Attacks, Spells. etc) if they aren't already present.
     */
    static async ensureExtendedData(actor) {
        if (actor.system?._hudInitialized) return actor;

        let targetDoc = null;

        // Case A: Actor has a token
        if (actor.token) {
            targetDoc = actor.token;
        }
        // Case B: Sidebar Actor with active tokens
        else if (actor.getActiveTokens) {
            const tokens = actor.getActiveTokens();
            if (tokens.length > 0) targetDoc = tokens[0].document;
        }

        // Case C: Create dummy token
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

        // Execute Derivation
        if (
            targetDoc &&
            typeof targetDoc.hudDeriveExtendedData === "function"
        ) {
            try {
                await targetDoc.hudDeriveExtendedData();
                return targetDoc.actor || actor;
            } catch (e) {
                console.warn("RMU Export | HUD derivation crashed:", e);
            }
        }

        // Fallback
        try {
            if (actor.prepareData) actor.prepareData();
            return actor;
        } catch (e) {
            return null;
        }
    }

    static getCleanData(targetActor) {
        if (!targetActor) return {};

        const sys = targetActor.system;

        return {
            header: this._getHeader(targetActor),
            quick_info: this._getQuickInfo(sys),
            stats: this._getStats(sys),
            resistances: this._getResistances(sys),
            defenses: this._getDefenses(sys, targetActor), // Pass actor for fallback
            attacks: this._getAttacks(targetActor),
            talents: this._getTalents(targetActor),
            skill_groups: this._getSkills(targetActor),
            spells: this._getSpells(targetActor),
            inventory: this._getInventory(targetActor),
        };
    }

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
        // --- MOVEMENT LOGIC ---
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

        // --- INITIATIVE LOGIC ---
        const init = sys._totalInitiativeBonus || 0;

        // --- ENDURANCE LOGIC ---
        const pEnc = sys._injuryBlock._endurance._bonusWithRacial ?? 0;
        const mEnc = sys._injuryBlock._concentration._bonusWithRacial ?? 0;

        return {
            bmr_value: `${bmr}'/rd`,
            bmr_mode: mode,
            initiative: init > 0 ? `+${init}` : init,
            hits: {
                current: sys.health?.hp?.value ?? 0,
                max: sys.health?.hp?.max ?? 0,
            },
            endurance_physical: pEnc > 0 ? `+${pEnc}` : pEnc,
            endurance_mental: mEnc > 0 ? `+${mEnc}` : mEnc,
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
                temp: data.tmp ?? 0,
                bonus: data.total > 0 ? `+${data.total}` : (data.total ?? 0),
            });
        }

        return stats;
    }

    static _getResistances(sys) {
        // Based on RMUData: block?._resistances ?? block?.resistances
        const block = sys._resistanceBlock || sys.resistanceBlock || {};
        const list =
            block._resistances ||
            block.resistances ||
            sys._resistances ||
            sys.resistances ||
            [];

        // Map standard 5, but source is an array, so we must find them
        const findRes = (name) => {
            const r = list.find((x) =>
                x.name.toLowerCase().includes(name.toLowerCase()),
            );
            return r ? (r.total ?? r.bonus ?? 0) : 0;
        };

        return [
            { label: "Channeling", bonus: findRes("Channeling") },
            { label: "Essence", bonus: findRes("Essence") },
            { label: "Mentalism", bonus: findRes("Mentalism") },
            { label: "Physical", bonus: findRes("Physical") },
            { label: "Fear", bonus: findRes("Fear") },
        ];
    }

    static _getDefenses(sys, actor) {
        // 1. Base Quickness DB (Qu Bonus x 3)
        const statBlock = sys._statBlock || {};
        const quStatBonus = statBlock.Qu?.total ?? 0;
        const quDb = quStatBonus * 3;

        // 2. Shield Bonus (if available)
        // Adjust path if shield bonus is stored elsewhere (e.g. in _armorWorn or separate object)
        const shieldBonus = sys.defenses?.shield?.bonus || 0;

        // 3. Dodge & Block (Lazy Getter Trigger)
        // Accessing these getters SHOULD trigger this.prepare() internally per developer notes
        let dodgeOpts = sys.dodgeOptions || actor.dodgeOptions;
        let blockOpts = sys.blockOptions || actor.blockOptions;

        // If they are still missing/empty, verify if we need to manually force prepare()
        // Note: The dev said accessing the getter calls prepare(), but if 'sys' is a plain object
        // (not the class instance), the getter won't exist. In that case, we try manual prepare.
        if ((!dodgeOpts || !blockOpts) && typeof sys.prepare === "function") {
            try {
                sys.prepare();
                // Re-read after manual prepare. Try private fields if getters fail.
                dodgeOpts = sys.dodgeOptions || sys._dodgeOptions;
                blockOpts = sys.blockOptions || sys._blockOptions;
            } catch (e) {
                console.warn("RMU Export | sys.prepare() failed:", e);
            }
        }

        // Safety defaults
        dodgeOpts = dodgeOpts || [];
        blockOpts = blockOpts || [];

        const getModifier = (opts, modeValue) => {
            if (!Array.isArray(opts)) return 0;
            const found = opts.find((o) => o.value === modeValue);
            return found ? found.modifier : 0;
        };

        // 4. Armor Data from _armor object
        const armorData = sys._armorWorn || {};

        const getArmorInfo = (loc) => {
            const part = armorData[loc];
            if (!part) return { name: "Unknown", at: 0 };

            let armorName = "Unknown";
            if (part.piece) {
                armorName = part.piece._base.material || "Unknown";
            }

            return {
                name: armorName,
                at: part.AT ?? 0,
            };
        };

        return {
            quickness_bonus: quDb > 0 ? `+${quDb}` : quDb,
            tactical: [
                {
                    mode: "Passive",
                    dodge: getModifier(dodgeOpts, "passive"),
                    block: getModifier(blockOpts, "passive"),
                },
                {
                    mode: "Partial (C)",
                    dodge: getModifier(dodgeOpts, "partial"),
                    block: getModifier(blockOpts, "partial"),
                },
                {
                    mode: "Full (4 AP)",
                    dodge: getModifier(dodgeOpts, "full"),
                    block: getModifier(blockOpts, "full"),
                },
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
            let rangeDisplay = "Melee";

            if (a.isRanged) {
                const shortRange = a.usage?.range?.short;
                rangeDisplay = shortRange ? `${shortRange}'` : "Ranged";
            }

            return {
                name: a.attackName || "Unknown Weapon",
                specialization: a.specialization || "Unknown",
                handed: a.handed || "",
                ob: a.totalBonus > 0 ? `+${a.totalBonus}` : a.totalBonus,
                damageType: a.chart.name || "Unknown",
                range: rangeDisplay,
                fumble: a.fumble || 0,
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

    static _getSkills(actor) {
        const src = actor.system._skills;
        if (!src) return [];

        const allSkills = [];

        // Recursive helper to find all skill objects deep in the tree
        const collectSkills = (node) => {
            if (!node) return;

            if (Array.isArray(node)) {
                node.forEach((child) => collectSkills(child));
            } else if (typeof node === "object") {
                // If it has a 'system' property or specific fields, it's likely a Skill Item
                // RMU derived skills usually have 'system' (if mapped from Item) or direct props like 'ranks' and 'bonus'
                // We check for 'name' and 'bonus'/'total' to confirm it's a skill we want
                if (
                    node.name &&
                    (node.bonus !== undefined ||
                        node.total !== undefined ||
                        node.ranks !== undefined)
                ) {
                    allSkills.push(node);
                } else {
                    // Otherwise, recurse into its values (it's a category/group container)
                    Object.values(node).forEach((child) =>
                        collectSkills(child),
                    );
                }
            }
        };

        collectSkills(src);

        // Group and Sort
        const grouped = {};
        allSkills.forEach((s) => {
            const cat = s.category || "General";
            if (!grouped[cat]) grouped[cat] = [];

            // Filter: Only show if Ranks > 0 or it's a Favorite/Core skill
            // You can adjust this threshold. Usually ranks > 0 is the standard "sheet" view.
            if (s._totalRanks > 0 || s.favorite) {
                // Determine the total bonus value
                // In RMU derived data: '_bonus' is usually the final total. 'total' is sometimes used.
                let finalBonus = s._bonus ?? s.bonus ?? 0;

                grouped[cat].push({
                    name: s.name,
                    specialisation: s.specialization || "",
                    ranks: s._totalRanks,
                    bonus: finalBonus > 0 ? `+${finalBonus}` : finalBonus,
                });
            }
        });

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

        const itemList = items.map((i) => {
            const weight = i.system.weight || i.system._weight.weight || 0;
            const qty = i.system.quantity || 1;

            return {
                name: i.item.name || i.system.name || "Unknown",
                qty: qty,
                weight: `${weight} lbs`,
            };
        });

        return {
            weight_allowance: `${actor.system._loadAllowed?.weight ?? 0} lbs`,
            weight_carried: `${actor.system._carriedWeight?.weight ?? 0} lbs`,
            enc_penalty: enc_penalty || 0,
            max_pace: actor.system.encumbrance?.pace || "Dash",
            items: itemList,
        };
    }
}
