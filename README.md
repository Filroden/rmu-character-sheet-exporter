# RMU Character Sheet Exporter

![Latest Version](https://img.shields.io/badge/Version-1.1.0-blue)
![Foundry Version](https://img.shields.io/badge/Foundry-v13-orange)
![License](https://img.shields.io/badge/License-MIT-yellow)
![System](https://img.shields.io/badge/System-RMU-blue)
![Download Count](https://img.shields.io/github/downloads/Filroden/rmu-character-sheet-exporter/rmu-character-sheet-exporter.zip)
![Download Count](https://img.shields.io/github/downloads/Filroden/rmu-character-sheet-exporter/latest/rmu-character-sheet-exporter.zip)
![Last Commit](https://img.shields.io/github/last-commit/Filroden/rmu-character-sheet-exporter)
![Issues](https://img.shields.io/github/issues/Filroden/rmu-character-sheet-exporter)

This is a simple module to create a printable version of a character or creature sheet.

## How to use

Click the "Export Sheet" button in the window header of any character or creature sheet.

![Window header of an actor sheet showing the Export Sheet button](https://github.com/Filroden/rmu-character-sheet-exporter/blob/main/screenshots/sheet_header.png)

Depending on the template you select, you will be offered additional options:

- **Template**: The sheet template you would like to use.
- **Output format**: The output format: the module currently only offers one printable export format, HTML.
- **Skill filters**: If you want only ranked or favourite skills to be shown, or all skills
- **Spell filters**: If you want to include the list of spells available within any known spell lists

Once exported, open HTML files in your browser and use your browser's "Print" function (either to a printer or to create a PDF). Sheets are set up to (hopefully) avoid adding page breaks in the middle of sections/lists.

## Templates

- **Standard Template**: This shows all the information you are likely to need to play the character laid out in a spacious template. You can choose to include some or all skills, and whether to include lists of spells.
- **Compact Template**: This does not show inventory or lists of spells and only shows ranked/favourite skills. It uses a more compact design so it can more easily be used as a stat block.

## Localisation & Translation

The exported sheet combines text from three different sources. If you see English text in a translated sheet, it is likely due to one of the following:

- The **Sheet Layout** (this module): Labels for sections (e.g., "Inventory", "Defenses", "Weight") are provided by this module. If these are in English, the module may need a translation update for your language.
- **Game Data** (the RMU system): Rules data (e.g., skill names like "Acrobatics", stats like "Ag", or attack tables) are fetched directly from the Rolemaster Unified system. The module attempts to look up the translated name within the system's files. If the core RMU system has not translated a specific skill or item, it will fallback to English.
- **User Input** (your data): Text that you or the GM have manually typed (e.g., specific item names, character background, or custom skill specialisations) is exported exactly as it appears on the sheet.

## Roadmap

- Add tournament template for full tabletop gameplay
- Embed export of actor.json into html for later recovery
- Add character or creature portraits
- Add additional output options
- Add an output preview window
