export class DataExtractor {
    /**
     * -----------------------------------------------------------
     * FORMATTING HELPERS
     * -----------------------------------------------------------
     */

    static _formatBonus(val) {
        if (val === null || val === undefined) return 0;
        return val > 0 ? `+${val}` : val;
    }

    static _i18n(key, fallback = "") {
        return game.i18n.localize(key) || fallback;
    }

    /**
     * -----------------------------------------------------------
     * DATA PREPARATION
     * -----------------------------------------------------------
     */
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

        if (
            targetDoc &&
            typeof targetDoc.hudDeriveExtendedData === "function"
        ) {
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

    /**
     * -----------------------------------------------------------
     * MAIN EXTRACTOR
     * -----------------------------------------------------------
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
            defenses: this._getDefenses(sys, targetActor),
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
        const unknownTxt = this._i18n("RMU_EXPORT.Common.Unknown", "Unknown");
        const noneTxt = this._i18n("RMU_EXPORT.Common.None", "None");

        const getSystemLabel = (prefix, val) => {
            if (!val) return unknownTxt;
            const key = `${prefix}.${val}`;
            if (game.i18n.has(key)) return game.i18n.localize(key);
            return val;
        };

        return {
            name: actor.name,
            race: getSystemLabel("RMU.Race", sys._header?._raceName),
            culture: getSystemLabel("RMU.Culture", sys._header?._cultureName),
            profession: getSystemLabel(
                "RMU.Profession",
                sys._header?._professionName,
            ),
            level: sys.experience?.level ?? 1,
            realm: sys.realm || noneTxt,
            size: getSystemLabel("RMU.Size", sys.appearance?.size),
        };
    }

    static _getQuickInfo(sys) {
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

        const init = sys._totalInitiativeBonus || 0;
        const pEnc = sys._injuryBlock._endurance._bonusWithRacial ?? 0;
        const mEnc = sys._injuryBlock._concentration._bonusWithRacial ?? 0;

        let modeLabel = mode;
        const skillKey = `RMU.Skills.${mode}`;

        if (game.i18n.has(skillKey)) {
            modeLabel = game.i18n.localize(skillKey);
        } else if (game.i18n.localize(mode) !== mode) {
            modeLabel = game.i18n.localize(mode);
        }

        return {
            bmr_value: `${bmr}'/rd`,
            bmr_mode: modeLabel,
            initiative: this._formatBonus(init),
            hits: {
                current: sys.health?.hp?.value ?? 0,
                max: sys.health?.hp?.max ?? 0,
            },
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

            const systemKey = `rmu.stats.${key}`;
            let label = game.i18n.localize(systemKey);

            if (label === systemKey) {
                label = this._i18n(`RMU_EXPORT.Stats.${key}`, key);
            }

            stats.push({
                label: label,
                bonus: this._formatBonus(data.total ?? 0),
            });
        }
        return stats;
    }

    static _getResistances(sys) {
        const block = sys._resistanceBlock || sys.resistanceBlock || {};
        const list =
            block._resistances ||
            block.resistances ||
            sys._resistances ||
            sys.resistances ||
            [];

        const resistanceKeys = [
            "Channeling",
            "Essence",
            "Mentalism",
            "Physical",
            "Fear",
        ];

        const findRes = (name) => {
            const r = list.find((x) =>
                x.name.toLowerCase().includes(name.toLowerCase()),
            );
            return r ? (r.total ?? r.bonus ?? 0) : 0;
        };

        return resistanceKeys.map((key) => {
            const systemKey = `RMU.Resistance.${key}`;
            let label = game.i18n.localize(systemKey);

            if (label === systemKey) {
                label = this._i18n(`RMU_EXPORT.Resistances.${key}`, key);
            }

            return {
                label: label,
                bonus: this._formatBonus(findRes(key)),
            };
        });
    }

    static _getDefenses(sys, actor) {
        const dbBlock = sys._dbBlock || {};
        const quDb = dbBlock.quicknessDB ?? 0;
        const armorDb = dbBlock.armorDB ?? 0;
        const otherDb = sys.defense?.other ?? 0;
        const shieldBonus = sys.defenses?.shield?.bonus || 0;
        const baseTotal = quDb + armorDb + otherDb;

        let dodgeOpts =
            dbBlock.dodgeOptions ||
            (actor._cachedDodge ? actor._cachedDodge : []);
        let blockOpts =
            dbBlock.blockOptions ||
            (actor._cachedBlock ? actor._cachedBlock : []);

        const getModifier = (opts, modeValue) => {
            if (!Array.isArray(opts)) return 0;
            const found = opts.find((o) => o.value === modeValue);
            return found ? (found.modifier ?? 0) : 0;
        };

        const passiveDodgeMod = getModifier(dodgeOpts, "passive");
        const passiveBlockMod = getModifier(blockOpts, "passive");

        const buildMode = (labelKey, modeKey) => {
            const currentDodgeMod = getModifier(dodgeOpts, modeKey);
            const currentBlockMod = getModifier(blockOpts, modeKey);
            let totalDodge = baseTotal + currentDodgeMod;
            let totalBlock = baseTotal + currentBlockMod + shieldBonus;

            if (modeKey !== "passive") {
                totalDodge += passiveBlockMod;
                totalBlock += passiveDodgeMod;
            }

            return {
                mode: this._i18n(
                    `RMU_EXPORT.DefenseMode.${labelKey}`,
                    labelKey,
                ),
                dodge: this._formatBonus(totalDodge),
                block: this._formatBonus(totalBlock),
            };
        };

        const armorData = sys._armorWorn || {};
        const noneTxt = this._i18n("RMU_EXPORT.Common.None", "None");

        const getArmorInfo = (loc) => {
            const part = armorData[loc];
            if (!part) return { name: noneTxt, at: 1 };
            return {
                name: part.piece?._base?.material || noneTxt,
                at: part.AT ?? 1,
            };
        };

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
        const unknownWpn = this._i18n(
            "RMU_EXPORT.Common.UnknownWeapon",
            "Unknown Weapon",
        );
        const unknownTxt = this._i18n("RMU_EXPORT.Common.Unknown", "Unknown");

        return attacks.map((a) => {
            let reachDisplay = "";
            if (a.meleeRange) reachDisplay = `${a.meleeRange}'`;

            let rangeDisplay = "";
            if (a.isRanged) {
                let rawRange = a.usage?.range?._shortRange;
                if (!rawRange) rawRange = a.usage?.range?.short;
                if (rawRange) {
                    const cleanRange = String(rawRange).replace(
                        /['"a-zA-Z\s]/g,
                        "",
                    );
                    rangeDisplay = `<${cleanRange}>`;
                }
            }

            let attackName = a.attackName || unknownWpn;
            const tableKey = `RMU.AttackTables.${a.attackName}`;
            const attackKey = `RMU.Attacks.${a.attackName}`;

            if (game.i18n.has(tableKey)) {
                attackName = game.i18n.localize(tableKey);
            } else if (game.i18n.has(attackKey)) {
                attackName = game.i18n.localize(attackKey);
            }

            let chartName = a.chart.name || unknownTxt;
            const chartKey = `RMU.AttackTables.${a.chart.name}`;
            if (game.i18n.has(chartKey)) {
                chartName = game.i18n.localize(chartKey);
            }

            let specialization = a.specialization || unknownTxt;
            if (a.specialization) {
                const specKey = `RMU.Specializations.${a.specialization}`;
                if (game.i18n.has(specKey)) {
                    specialization = game.i18n.localize(specKey);
                }
            }

            return {
                name: attackName,
                specialization: specialization,
                handed: a.handed || "",
                ob: this._formatBonus(a.totalBonus ?? 0),
                damageType: chartName,
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
        const generalTxt = this._i18n("RMU_EXPORT.Common.General", "General");

        talents.forEach((t) => {
            const group = t.system.category || "General";
            if (!grouped[group]) grouped[group] = [];

            const translatedName = game.i18n.localize(t.name);

            grouped[group].push({
                name: translatedName,
                tier: t.system.tier || "",
            });
        });

        return Object.keys(grouped)
            .sort()
            .map((key) => {
                let displayGroup = key;
                if (key === "General") displayGroup = generalTxt;
                else if (game.i18n.has(key))
                    displayGroup = game.i18n.localize(key);

                return {
                    group: displayGroup,
                    entries: grouped[key],
                };
            });
    }

    static _getSkills(actor, options = {}) {
        const src = actor.system._skills;
        if (!src) return [];

        const allSkills = [];

        const collectSkills = (node) => {
            if (!node) return;
            if (Array.isArray(node)) {
                node.forEach((child) => collectSkills(child));
                return;
            }
            if (typeof node === "object") {
                if (node.system && node.system._canDevelop === true) {
                    allSkills.push(node.system);
                    return;
                }
                if (node._canDevelop === true) {
                    allSkills.push(node);
                    return;
                }
                Object.keys(node).forEach((key) => {
                    if (key !== "system") collectSkills(node[key]);
                });
            }
        };

        collectSkills(src);

        const grouped = {};
        const generalTxt = this._i18n("RMU_EXPORT.Common.General", "General");

        allSkills.forEach((s) => {
            const rawCat = s.category || "General";
            if (!grouped[rawCat]) grouped[rawCat] = [];

            if (options.showAllSkills || s._totalRanks > 0 || s.favorite) {
                let finalBonus = s._bonus ?? s.bonus ?? 0;

                let displayName = s.name;
                const skillKey = `RMU.Skills.${s.name}`;
                if (game.i18n.has(skillKey)) {
                    displayName = game.i18n.localize(skillKey);
                }

                let displaySpec = s.specialization || "";
                if (displaySpec) {
                    const specKey = `RMU.Specializations.${displaySpec}`;
                    if (game.i18n.has(specKey)) {
                        displaySpec = game.i18n.localize(specKey);
                    }
                }

                grouped[rawCat].push({
                    sortName: s.name,
                    name: displayName,
                    specialisation: displaySpec,
                    ranks: s._totalRanks ?? 0,
                    bonus: this._formatBonus(finalBonus),
                });
            }
        });

        return Object.keys(grouped)
            .filter((key) => grouped[key].length > 0)
            .sort()
            .map((rawKey) => {
                let displayCat = rawKey;
                if (rawKey === "General") {
                    displayCat = generalTxt;
                } else {
                    const catKey = `RMU.SkillCategory.${rawKey}`;
                    if (game.i18n.has(catKey)) {
                        displayCat = game.i18n.localize(catKey);
                    }
                }

                const sortedList = grouped[rawKey].sort((a, b) =>
                    a.sortName.localeCompare(b.sortName),
                );

                return {
                    category: displayCat,
                    list: sortedList,
                };
            });
    }

    static _getSpells(actor) {
        const rawSpells = actor.system._spells || [];
        const spellGroups = [];

        if (Array.isArray(rawSpells)) {
            rawSpells.forEach((typeGroup) => {
                let listType = typeGroup.listType;
                if (game.i18n.has(`RMU.SpellListType.${listType}`)) {
                    listType = game.i18n.localize(
                        `RMU.SpellListType.${listType}`,
                    );
                }

                if (typeGroup.spellLists) {
                    typeGroup.spellLists.forEach((list) => {
                        const knownSpells = (list.spells || []).filter(
                            (s) => s.known,
                        );

                        if (knownSpells.length > 0) {
                            const translatedListName = game.i18n.localize(
                                list.spellListName,
                            );

                            spellGroups.push({
                                listName: translatedListName,
                                type: listType,
                                spells: knownSpells.map((s) => ({
                                    name: game.i18n.localize(s.name),
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
        const unknownTxt = this._i18n("RMU_EXPORT.Common.Unknown", "Unknown");

        const itemList = items.map((i) => {
            const weight = i.system.weight || i.system._weight.weight || 0;
            const qty = i.system.quantity || 1;

            let itemName = i.item.name || i.system.name || unknownTxt;
            itemName = game.i18n.localize(itemName);

            return {
                name: itemName,
                qty: qty,
                weight: `${weight} lbs`,
            };
        });

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
