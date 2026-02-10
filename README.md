# RMU Character Sheet Exporter

![Latest Version](https://img.shields.io/badge/Version-1.0.0-blue)
![Foundry Version](https://img.shields.io/badge/Foundry-v13-orange)
![License](https://img.shields.io/badge/License-MIT-yellow)
![System](https://img.shields.io/badge/System-RMU-blue)
![Download Count](https://img.shields.io/github/downloads/Filroden/rmu-character-sheet-exporter/rmu-character-sheet-exporter.zip)
![Download Count](https://img.shields.io/github/downloads/Filroden/rmu-character-sheet-exporter/latest/rmu-character-sheet-exporter.zip)
![Last Commit](https://img.shields.io/github/last-commit/Filroden/rmu-character-sheet-exporter)
![Issues](https://img.shields.io/github/issues/Filroden/rmu-character-sheet-exporter)

This is a simple module to create a printable version of the character sheet. Use the "Export Sheet" button in the header of any character and select:

* If you want only ranked or favourite skills to be shown, or all skills
* If you want to include the list of spells available within any known spell lists

The module currently only offers one printable export format, HTML. Open the file in your browser and use your browser's "Print" function. Sheets are set up to (hopefully) not add page breaks in the middle of sections/lists.

## Important Notes

* This is a Beta version. The code should be bug free but if you find any of the data in the exported sheet does not match the data inside the character sheet inside FoundryVTT then let me know.
* This only works on characters, not creatures (see roadmap).

## Roadmap

* Add compact template
* Embed export of actor.json into html for later recovery
* Portrait
* Add markdown output
* Creatures
