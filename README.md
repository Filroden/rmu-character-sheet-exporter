# RMU Character Sheet Exporter

![Latest Version](https://img.shields.io/badge/Version-1.3.0-blue)
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

This will open a preview window, showing options on the left and a preview of the character sheet on the right.

![Character Sheet Preview Window](https://github.com/Filroden/rmu-character-sheet-exporter/blob/main/screenshots/sheet_preview.png)

Depending on the template you select, you will be offered additional options:

- **Layout**: The sheet layout design you would like to use.
- **Theme**: The style of the sheet.
- **Output format**: The output format: the module currently only offers one printable export format, HTML.
- **Skill filters**: Choose if you want to show only ranked or favourite skills, or all skills
- **Section toggles**: Toggle on or off each section in the sheet.

Once exported, open HTML files in your browser and use your browser's "Print" function (either to a printer or to create a PDF). Sheets are set up to (hopefully) avoid adding page breaks in the middle of sections/lists.

## Localisation & Translation

The exported sheet combines text from three different sources. If you see English text in a translated sheet, it is likely due to one of the following:

- The **Sheet Layout** (this module): Labels for sections (e.g., "Inventory", "Defenses", "Weight") are provided by this module. If these are in English, the module may need a translation update for your language.
- **Game Data** (the RMU system): Rules data (e.g., skill names like "Acrobatics", stats like "Ag", or attack tables) are fetched directly from the Rolemaster Unified system. The module attempts to look up the translated name within the system's files. If the core RMU system has not translated a specific skill or item, it will fallback to English.
- **User Input** (your data): Text that you or the GM have manually typed (e.g., specific item names, character background, or custom skill specialisations) is exported exactly as it appears on the sheet.

## Roadmap

- Add tournament template for tabletop gameplay at conventions
- Embed export of actor.json into html for later recovery
- Add character or creature portraits / biography / appearance block
- Add movement block
