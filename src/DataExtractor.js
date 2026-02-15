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

    static get isMetric() {
        return game.settings.get("rmu", "measurementSystem") === "Metric";
    }

    /**
     * -----------------------------------------------------------
     * METRIC CONVERSION HELPERS
     * -----------------------------------------------------------
     */
    static _toMetricWeight(pounds) {
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
        const options = {
            style: "decimal",
            minimumFractionDigits: 0,
            maximumFractionDigits: digits,
            useGrouping: false,
        };
        return roundedKilograms.toLocaleString(undefined, options) + " kg";
    }

    static _toMetricMovement(feet) {
        const metersExact = feet * 0.3048;
        const rd = metersExact < 4 ? 100 : 2;
        if (rd > 2) {
            const meters = Math.floor(metersExact * 25) / 25;
            return (
                meters.toLocaleString(undefined, {
                    style: "decimal",
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 1,
                    useGrouping: false,
                }) + " m"
            );
        }
        const meters = Math.floor(metersExact * rd) / rd;
        return (
            meters.toLocaleString(undefined, {
                style: "decimal",
                minimumFractionDigits: 0,
                maximumFractionDigits: 1,
                useGrouping: false,
            }) + " m"
        );
    }

    static _toMetricReach(feet) {
        const meters = feet * 0.3048;
        return (
            meters.toLocaleString(undefined, {
                style: "decimal",
                minimumFractionDigits: 0,
                maximumFractionDigits: 1,
                useGrouping: false,
            }) + " m"
        );
    }

    static _toMetricRange(feet) {
        const meters = Math.round(feet * 0.3048);
        return meters + " m";
    }

    static _toMetricHeight(feet) {
        const meters = feet * 0.3048;
        return (
            meters.toLocaleString(undefined, {
                style: "decimal",
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
                useGrouping: false,
            }) + " m"
        );
    }

    /**
     * -----------------------------------------------------------
     * PARSING HELPERS
     * -----------------------------------------------------------
     */
    static _parseHeightString(str) {
        if (!str) return 0;
        const match = str.match(/(\d+)'\s*(?:(\d+)")?/);
        if (match) {
            const feet = parseInt(match[1]) || 0;
            const inches = parseInt(match[2]) || 0;
            return feet + inches / 12;
        }
        return parseFloat(str) || 0;
    }

    static _parseWeightString(str) {
        if (!str) return 0;
        const clean = str.replace(/[^\d.]/g, "");
        return parseFloat(clean) || 0;
    }

    static async _imageToBase64(url) {
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

    /**
     * -----------------------------------------------------------
     * CLEANING HELPERS
     * -----------------------------------------------------------
     */
    static _cleanObject(obj) {
        if (typeof obj !== "object" || obj === null) return obj;

        if (Array.isArray(obj)) {
            return obj.map((item) => this._cleanObject(item));
        }

        const cleaned = {};
        for (const key in obj) {
            if (key.startsWith("_")) continue;
            cleaned[key] = this._cleanObject(obj[key]);
        }
        return cleaned;
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
     * MAIN EXTRACTOR (Async)
     * -----------------------------------------------------------
     */
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
            skills = true,
            spells = true,
            inventory = true,
            talents = true,
        } = options;

        // 1. Fetch Portrait (Async)
        let portraitData = null;
        if (portrait) {
            portraitData = await this._imageToBase64(targetActor.img);
        }

        // 2. Fetch Split Bio Data
        const detailsData = details ? this._getDetails(targetActor) : null;
        const bioTextData = biography
            ? this._getBiographyText(targetActor)
            : null;

        // 3. Raw Foundry Data (CLEANED & COMPACTED)
        const rawObj = targetActor.toObject();
        const cleanObj = this._cleanObject(rawObj);
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
                skills,
                spells,
                inventory,
                talents,
            },
            header_data: header ? this._getHeader(targetActor) : null,
            portrait_data: portraitData,

            details_data: detailsData,
            biography_data: bioTextData,

            raw_foundry_data: rawFoundryData,

            quick_info_data: quick_info ? this._getQuickInfo(sys) : null,
            stats_data: stats ? this._getStats(sys) : null,
            resistances_data: stats ? this._getResistances(sys) : null,
            defenses_data: defenses
                ? this._getDefenses(sys, targetActor)
                : null,
            attacks_data: attacks ? this._getAttacks(targetActor) : null,
            talents_data: talents ? this._getTalents(targetActor) : null,
            skill_groups_data: skills
                ? this._getSkills(targetActor, { showAllSkills })
                : [],
            spells_data: spells ? this._getSpells(targetActor) : [],
            inventory_data: inventory ? this._getInventory(targetActor) : null,

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
        let realmLabel = sys.realm || noneTxt;
        if (sys.realm) {
            const realmKey = `RMU.RealmsOfMagic.${sys.realm}`;
            if (game.i18n.has(realmKey))
                realmLabel = game.i18n.localize(realmKey);
        }
        return {
            name: actor.name,
            race: getSystemLabel("RMU.Race", sys._header?._raceName),
            culture: getSystemLabel("RMU.Culture", sys._header?._cultureName),
            profession: getSystemLabel(
                "RMU.Profession",
                sys._header?._professionName,
            ),
            level: sys.experience?.level ?? 1,
            realm: realmLabel,
            size: getSystemLabel("RMU.Size", sys.appearance?.size),
        };
    }

    static _getDetails(actor) {
        const sys = actor.system;
        const app = sys.appearance || {};
        const id = sys.identity || {};
        const player = sys.player || {};
        const encounter = sys.encounter || {};

        let heightDisplay = app._height || "";
        let weightDisplay = app._weight || "";

        if (this.isMetric) {
            const feet = this._parseHeightString(app._height);
            if (feet > 0) heightDisplay = this._toMetricHeight(feet);

            const lbs = this._parseWeightString(app._weight);
            if (lbs > 0) weightDisplay = this._toMetricWeight(lbs);
        }

        const compactPlayer = [];
        if (player.name) compactPlayer.push(player.name);
        if (player.campaign) compactPlayer.push(player.campaign);
        if (sys.powerLevel) compactPlayer.push(sys.powerLevel);

        const compactApp = [];
        const pushApp = (key, val) => {
            if (val) compactApp.push(`${this._i18n(key)}: ${val}`);
        };
        pushApp("RMU_EXPORT.Bio.Age", app.age);
        pushApp("RMU_EXPORT.Bio.Height", heightDisplay);
        pushApp("RMU_EXPORT.Bio.Weight", weightDisplay);
        pushApp("RMU_EXPORT.Bio.Eyes", app.eyes);
        pushApp("RMU_EXPORT.Bio.Hair", app.hair);

        return {
            player_name: player.name || "",
            campaign: player.campaign || "",
            power_level: sys.powerLevel || "",

            age: app.age || "",
            eyes: app.eyes || "",
            hair: app.hair || "",
            height: heightDisplay,
            weight: weightDisplay,
            sex: app.sex || "",
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

    static _getBiographyText(actor) {
        const sys = actor.system;
        const id = sys.identity || {};

        return {
            text: id.bio || sys.description || "",
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

        let bmrDisplay = `${bmr}'/rd`;
        if (this.isMetric) {
            bmrDisplay = `${this._toMetricMovement(bmr)}/rd`;
        }

        return {
            bmr_value: bmrDisplay,
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

            let matName = part.piece?._base?.material || noneTxt;

            if (part.piece?._base?.material) {
                const rawMat = part.piece._base.material;
                const cleanMat = rawMat.replace(/\s+/g, "");

                const armorKey = `RMU.ArmorTypes.${cleanMat}`;
                if (game.i18n.has(armorKey)) {
                    matName = game.i18n.localize(armorKey);
                }
            }

            return {
                name: matName,
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
            let rangeDisplay = "";
            if (a.isRanged) {
                let rawRangeVal = a.usage?.range?.short;
                if (rawRangeVal !== undefined && rawRangeVal !== null) {
                    if (this.isMetric) {
                        rangeDisplay = `<${this._toMetricRange(rawRangeVal)}>`;
                    } else {
                        rangeDisplay = `<${rawRangeVal}'>`;
                    }
                } else {
                    let rawRangeStr = a.usage?.range?._shortRange;
                    if (rawRangeStr) {
                        const cleanRange = String(rawRangeStr).replace(
                            /['"a-zA-Z\s]/g,
                            "",
                        );
                        if (this.isMetric) {
                            if (String(rawRangeStr).includes("m")) {
                                rangeDisplay = `<${cleanRange} m>`;
                            } else {
                                const numeric = parseFloat(cleanRange);
                                if (!isNaN(numeric)) {
                                    rangeDisplay = `<${this._toMetricRange(numeric)}>`;
                                } else {
                                    rangeDisplay = `<${cleanRange}>`;
                                }
                            }
                        } else {
                            rangeDisplay = `<${cleanRange}>`;
                        }
                    }
                }
            }

            let reachDisplay = "";
            if (!rangeDisplay && a.meleeRange) {
                if (this.isMetric) {
                    reachDisplay = this._toMetricReach(a.meleeRange);
                } else {
                    reachDisplay = `${a.meleeRange}'`;
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

            let weightDisplay = `${weight} lbs`;
            if (this.isMetric) {
                weightDisplay = this._toMetricWeight(weight);
            }

            return {
                name: itemName,
                qty: qty,
                weight: weightDisplay,
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

        const allowance = actor.system._loadAllowed?.weight ?? 0;
        const carried = actor.system._carriedWeight?.weight ?? 0;

        const cleanAllowance = Math.round(Number(allowance) * 100) / 100;
        const cleanCarried = Math.round(Number(carried) * 100) / 100;

        let allowanceDisplay = `${cleanAllowance} lbs`;
        let carriedDisplay = `${cleanCarried} lbs`;

        if (this.isMetric) {
            allowanceDisplay = this._toMetricWeight(cleanAllowance);
            carriedDisplay = this._toMetricWeight(cleanCarried);
        }

        return {
            weight_allowance: allowanceDisplay,
            weight_carried: carriedDisplay,
            enc_penalty: enc_penalty || 0,
            max_pace: maxPace,
            items: itemList,
        };
    }
}
