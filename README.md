# RMU Character Sheet Exporter

![Latest Version](https://img.shields.io/badge/Version-1.0.0-blue)
![Foundry Version](https://img.shields.io/badge/Foundry-v13-orange)
![License](https://img.shields.io/badge/License-MIT-yellow)
![System](https://img.shields.io/badge/System-RMU-blue)
![Download Count](https://img.shields.io/github/downloads/Filroden/rmu-character-sheet-exporter/rmu-character-sheet-exporter.zip)
![Download Count](https://img.shields.io/github/downloads/Filroden/rmu-character-sheet-exporter/latest/rmu-character-sheet-exporter.zip)
![Last Commit](https://img.shields.io/github/last-commit/Filroden/rmu-character-sheet-exporter)
![Issues](https://img.shields.io/github/issues/Filroden/rmu-character-sheet-exporter)

This is a simple module to create a printable version of the character sheet.

## How to use

Click the "Export Sheet" button in the window header of any character actor sheet.

![Window header of a character actor sheet showing the Export Sheet button](https://github.com/Filroden/rmu-character-sheet-exporter/blob/main/screenshots/sheet_header.png)

Select:

* If you want only ranked or favourite skills to be shown, or all skills
* If you want to include the list of spells available within any known spell lists

The module currently only offers one printable export format, HTML.

Open the file in your browser and use your browser's "Print" function (either to a printer or to create a PDF). Sheets are set up to (hopefully) avoid adding page breaks in the middle of sections/lists.

## Roadmap

* Add internationalisation
* Support creatures
* Add compact template for NPC/creature stat blocks
* Add tournament template for full tabletop gameplay
* Embed export of actor.json into html for later recovery
* Add character or creature portraits
* Add additional output options
* Add an output preview window
