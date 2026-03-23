# Example data paths and/or objects

## Current experience

Path: system.experience.xp
Value: integer

## Stats

### Potential

Path: `system.stats.[stat].pot`
Value: integer

### Temporary

Path: `system.stats.[stat].tmp`
Value: integer

## Conditions

### Hit loss penalty

Path: `system._injuryBlock._hitLossPenalty`
Value: integer (<= 0)

### Injury, Stun and Fatigue penalties

Path: Calculated by summing across all `system._injuryBlock._effects.[array].value.system.penalty' when 'system._injuryBlock._effects.[array].value.system.type` is "Injury", "stun" or "fatigue".
Value: integer (<= 0)

### Injuries table showing location, effect and severity and current active effects showing source, enchantment name, bonus, effect and remaining duration

See example object:

```json
[
    {
        "name": "Bleed",
        "changes": [],
        "transfer": false,
        "disabled": false,
        "duration": {
            "combat": null,
            "startRound": 0,
            "rounds": 22,
            "startTime": 1773878415
        },
        "system": {
            "type": "injury",
            "effect": "Bleed",
            "value": 6,
            "description": "Point passes between forearm bones, passing through skin and scoring muscle.",
            "location": {
                "locationLabel": "Arm",
                "location": "Arm",
                "sideLabel": "Left",
                "side": "Left"
            }
        },
        "flags": {
            "rmu": {
                "expires": false
            }
        },
        "img": "systems/rmu/icons/third-party/gin-webp/bleed.webp",
        "_id": "9SGQtNeVznBrHdNk",
        "type": "base",
        "description": "",
        "origin": null,
        "tint": "#ffffff",
        "statuses": [],
        "sort": 0,
        "_stats": {
            "compendiumSource": null,
            "duplicateSource": null,
            "exportSource": null,
            "coreVersion": "13.351",
            "systemId": "rmu",
            "systemVersion": "1.1.76",
            "createdTime": 1774098392462,
            "modifiedTime": 1774098392462,
            "lastModifiedBy": "efINOGYLKyEGdyHM"
        }
    },
    {
        "name": "Injury",
        "changes": [],
        "transfer": false,
        "disabled": false,
        "system": {
            "type": "injury",
            "effect": "Injury",
            "penalty": -15,
            "rounds": 0,
            "description": "Point passes between forearm bones, passing through skin and scoring muscle.",
            "location": {
                "locationLabel": "Arm",
                "location": "Arm",
                "sideLabel": "Left",
                "side": "Left"
            }
        },
        "flags": {
            "rmu": {
                "expires": false
            }
        },
        "img": "systems/rmu/icons/third-party/gin-webp/injury.webp",
        "_id": "apkHja4pgn06y1sr",
        "type": "base",
        "duration": {
            "startTime": 1773878415,
            "combat": null
        },
        "description": "",
        "origin": null,
        "tint": "#ffffff",
        "statuses": [],
        "sort": 0,
        "_stats": {
            "compendiumSource": null,
            "duplicateSource": null,
            "exportSource": null,
            "coreVersion": "13.351",
            "systemId": "rmu",
            "systemVersion": "1.1.76",
            "createdTime": 1774098392462,
            "modifiedTime": 1774098392462,
            "lastModifiedBy": "efINOGYLKyEGdyHM"
        }
    },
    {
        "name": "Bleed",
        "changes": [],
        "transfer": false,
        "disabled": false,
        "duration": {
            "combat": null,
            "startRound": 0,
            "rounds": 33,
            "startTime": 1773878415
        },
        "system": {
            "type": "injury",
            "effect": "Bleed",
            "value": 4,
            "description": "Deep stab into shoulder damages muscle.",
            "location": {
                "locationLabel": "Arm",
                "location": "Arm",
                "sideLabel": "Left",
                "side": "Left"
            }
        },
        "flags": {
            "rmu": {
                "expires": false
            }
        },
        "img": "systems/rmu/icons/third-party/gin-webp/bleed.webp",
        "_id": "E4QgFbPIKHnsnt5L",
        "type": "base",
        "description": "",
        "origin": null,
        "tint": "#ffffff",
        "statuses": [],
        "sort": 0,
        "_stats": {
            "compendiumSource": null,
            "duplicateSource": null,
            "exportSource": null,
            "coreVersion": "13.351",
            "systemId": "rmu",
            "systemVersion": "1.1.76",
            "createdTime": 1774098392462,
            "modifiedTime": 1774098392462,
            "lastModifiedBy": "efINOGYLKyEGdyHM"
        }
    },
    {
        "name": "Injury",
        "changes": [],
        "transfer": false,
        "disabled": false,
        "system": {
            "type": "injury",
            "effect": "Injury",
            "penalty": -10,
            "rounds": 0,
            "description": "Deep stab into shoulder damages muscle.",
            "location": {
                "locationLabel": "Arm",
                "location": "Arm",
                "sideLabel": "Left",
                "side": "Left"
            }
        },
        "flags": {
            "rmu": {
                "expires": false
            }
        },
        "img": "systems/rmu/icons/third-party/gin-webp/injury.webp",
        "_id": "v4fKiYlq5sng0h64",
        "type": "base",
        "duration": {
            "startTime": 1773878415,
            "combat": null
        },
        "description": "",
        "origin": null,
        "tint": "#ffffff",
        "statuses": [],
        "sort": 0,
        "_stats": {
            "compendiumSource": null,
            "duplicateSource": null,
            "exportSource": null,
            "coreVersion": "13.351",
            "systemId": "rmu",
            "systemVersion": "1.1.76",
            "createdTime": 1774098392462,
            "modifiedTime": 1774098392462,
            "lastModifiedBy": "efINOGYLKyEGdyHM"
        }
    },
    {
        "name": "Injury",
        "changes": [],
        "transfer": false,
        "disabled": false,
        "system": {
            "type": "injury",
            "effect": "Injury",
            "penalty": -5,
            "rounds": 0,
            "description": "Stabbing foe in the elbow damages joint, draws blood and cry of pain. You feel triumphant.",
            "location": {
                "locationLabel": "Arm",
                "location": "Arm",
                "sideLabel": "Left",
                "side": "Left"
            }
        },
        "flags": {
            "rmu": {
                "expires": false
            }
        },
        "img": "systems/rmu/icons/third-party/gin-webp/injury.webp",
        "_id": "2kVEaPFwvSGdH0ge",
        "type": "base",
        "duration": {
            "startTime": 1773878415,
            "combat": null
        },
        "description": "",
        "origin": null,
        "tint": "#ffffff",
        "statuses": [],
        "sort": 0,
        "_stats": {
            "compendiumSource": null,
            "duplicateSource": null,
            "exportSource": null,
            "coreVersion": "13.351",
            "systemId": "rmu",
            "systemVersion": "1.1.76",
            "createdTime": 1774098392462,
            "modifiedTime": 1774098392462,
            "lastModifiedBy": "efINOGYLKyEGdyHM"
        }
    },
    {
        "name": "Bleed",
        "changes": [],
        "transfer": false,
        "disabled": false,
        "duration": {
            "combat": null,
            "startRound": 0,
            "rounds": 66,
            "startTime": 1773878415
        },
        "system": {
            "type": "injury",
            "effect": "Bleed",
            "value": 2,
            "description": "Stabbing foe in the elbow damages joint, draws blood and cry of pain. You feel triumphant.",
            "location": {
                "locationLabel": "Arm",
                "location": "Arm",
                "sideLabel": "Left",
                "side": "Left"
            }
        },
        "flags": {
            "rmu": {
                "expires": false
            }
        },
        "img": "systems/rmu/icons/third-party/gin-webp/bleed.webp",
        "_id": "aoeJ3Y7kj8a0ydOy",
        "type": "base",
        "description": "",
        "origin": null,
        "tint": "#ffffff",
        "statuses": [],
        "sort": 0,
        "_stats": {
            "compendiumSource": null,
            "duplicateSource": null,
            "exportSource": null,
            "coreVersion": "13.351",
            "systemId": "rmu",
            "systemVersion": "1.1.76",
            "createdTime": 1774098392462,
            "modifiedTime": 1774098392462,
            "lastModifiedBy": "efINOGYLKyEGdyHM"
        }
    },
    {
        "name": "Prone",
        "changes": [],
        "transfer": false,
        "disabled": false,
        "duration": {
            "combat": null,
            "startRound": 0,
            "rounds": 500,
            "startTime": 1773878415
        },
        "system": {
            "type": "prone",
            "effect": "Prone",
            "value": 0,
            "description": "Prone"
        },
        "flags": {
            "rmu": {
                "expires": false
            }
        },
        "img": "systems/rmu/icons/third-party/gin-webp/prone.webp",
        "_id": "zRM6w2TrojX6nd9T",
        "type": "base",
        "description": "",
        "origin": null,
        "tint": "#ffffff",
        "statuses": [],
        "sort": 0,
        "_stats": {
            "compendiumSource": null,
            "duplicateSource": null,
            "exportSource": null,
            "coreVersion": "13.351",
            "systemId": "rmu",
            "systemVersion": "1.1.76",
            "createdTime": 1774098392462,
            "modifiedTime": 1774098392462,
            "lastModifiedBy": "efINOGYLKyEGdyHM"
        }
    },
    {
        "name": "Fatigue",
        "changes": [],
        "transfer": false,
        "disabled": false,
        "system": {
            "type": "fatigue",
            "effect": "Fatigue",
            "penalty": -15,
            "description": "Fatigue"
        },
        "flags": {
            "rmu": {
                "expires": false
            }
        },
        "img": "systems/rmu/icons/third-party/mdi-webp/fatigue.webp",
        "_id": "DbkmaBOeR76fVt9y",
        "type": "base",
        "duration": {
            "startTime": 1773878415,
            "combat": null
        },
        "description": "",
        "origin": null,
        "tint": "#ffffff",
        "statuses": [],
        "sort": 0,
        "_stats": {
            "compendiumSource": null,
            "duplicateSource": null,
            "exportSource": null,
            "coreVersion": "13.351",
            "systemId": "rmu",
            "systemVersion": "1.1.76",
            "createdTime": 1774098410573,
            "modifiedTime": 1774098410960,
            "lastModifiedBy": "efINOGYLKyEGdyHM"
        }
    },
    {
        "name": "Stun",
        "changes": [],
        "transfer": false,
        "disabled": false,
        "duration": {
            "combat": null,
            "startRound": 0,
            "rounds": 5,
            "startTime": 1773878415
        },
        "system": {
            "type": "stun",
            "rounds": [
                2,
                2,
                1
            ],
            "delayDecayRounds": [
                0,
                0,
                0
            ]
        },
        "flags": {
            "rmu": {
                "expires": true
            }
        },
        "img": "systems/rmu/icons/third-party/mdi-webp/stun.webp",
        "_id": "JhgY83dSNK5hL6sF",
        "type": "base",
        "description": "",
        "origin": null,
        "tint": "#ffffff",
        "statuses": [],
        "sort": 0,
        "_stats": {
            "compendiumSource": null,
            "duplicateSource": null,
            "exportSource": null,
            "coreVersion": "13.351",
            "systemId": "rmu",
            "systemVersion": "1.1.76",
            "createdTime": 1774098418311,
            "modifiedTime": 1774098421358,
            "lastModifiedBy": "efINOGYLKyEGdyHM"
        }
    },
    {
        "name": "Power Multiplier II",
        "transfer": true,
        "disabled": false,
        "duration": {
            "startTime": 0,
            "combat": null,
            "startRound": 0,
            "startTurn": 0
        },
        "system": {
            "summary": {
                "type": "power",
                "level": 12,
                "realm": "Essence",
                "bonus": "x1.5",
                "sub1": "",
                "sub1Label": "RMU.Enchantment.PPMultiplier",
                "sub2": "",
                "sub2Label": "",
                "sub3": "",
                "sub3Label": ""
            }
        },
        "changes": [
            {
                "key": "system.health.ppm",
                "mode": 2,
                "value": "0",
                "priority": 0
            },
            {
                "key": "system.health.ppm",
                "mode": 4,
                "value": "1.5",
                "priority": 20
            }
        ],
        "_id": "R7fJPeAvMQ9qK6ic",
        "img": null,
        "type": "base",
        "description": "",
        "origin": null,
        "tint": "#ffffff",
        "statuses": [],
        "sort": 0,
        "flags": {},
        "_stats": {
            "compendiumSource": null,
            "duplicateSource": null,
            "exportSource": null,
            "coreVersion": "13.351",
            "systemId": "rmu",
            "systemVersion": "0.99.32",
            "lastModifiedBy": null
        }
    }
]
```

## Attacks

If `actor.system._attacks.[array].breakage` is "true", then display:

### Weapon strength

Path: `actor.system._attacks.[array].itemStrength`
Value: integer (> 0)

### Weapon breakage damage

Path: `actor.system._attacks.[array].damagePenalty`
Value: integer (<= 0)

## Spells

### Example Spell object

Path: `actor.system._spells.[array].spellLists.spells`

```json
{
    "spellList": "Anticipations",
    "listType": "Open",
    "profession": "",
    "name": "Anticipate Attack",
    "level": 1,
    "description": "Caster becomes aware of his primary foe’s likely attack. If the caster parries,\nthe DB gained from the parry is doubled.",
    "aoe": "caster",
    "duration": "--",
    "range": "self",
    "spellType": "U",
    "modifiers": "*",
    "flags": {
        "rmu": {
            "es": {
                "description": "El lanzador percibe el ataque probable de su enemigo principal. Si para, el DB obtenido se duplica.",
                "name": "Anticipar Ataque"
            }
        }
    },
    "innate": null,
    "known": true,
    "_spellId": "Anticipate Attack",
    "_realms": "Mentalism",
    "_spellListName": "Anticipations",
    "_translatedName": "Anticipate Attack",
    "_translatedDescription": "Caster becomes aware of his primary foe’s likely attack. If the caster parries,\nthe DB gained from the parry is doubled.",
    "_modifiedRange": {
        "range": "self",
        "hasRange": false,
        "hasLvl": false,
        "hasStart": false,
        "modifiedByTalent": false
    },
    "_modifiedAoE": {
        "aoe": "caster",
        "hasTargetLvl": false,
        "hasRadiusLvl": false,
        "hasVolumeLvl": true,
        "hasVolume": false,
        "hasTargets": false,
        "hasRadius": false,
        "fmt": true,
        "modifiedByTalent": false
    },
    "_modifiedDuration": {
        "fmt": false
    },
    "graceReduction": 0,
    "unmodifiedOvercastPenalty": 0,
    "overcastPenalty": 0,
    "injuryPenalty": 0,
    "encumbrancePenalty": -7,
    "armorSpellCastingPenalty": -75,
    "transcendenceReduction": 75,
    "originalListType": "Open",
    "innateSpell": false,
    "scrRanks": 35,
    "scrListModifier": 0,
    "scrRealmStatBonus": 14,
    "scrTalentModifier": 0,
    "scrBonusFromEffects": 0,
    "scr": 49
}
```
