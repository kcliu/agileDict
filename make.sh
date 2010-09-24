#!/bin/bash
#pushd chrome/chromeFiles
#zip -r addons.jar content/ skin/
#popd
zip addons.xpi install.rdf chrome.manifest chrome/chromeFiles/* components/* -r
#rm chrome/chromeFiles/vocab.jar
