/*
 * Name: ComicScanner
 * Description: Class used to scan the filesystem for comics
 * Author: Thomas Lanteigne
 * Date: 25 Nov 2014
 */

var fs = require("fs"),
    path = require("path"),
    config = require("../config"),
    Utils = require("./Utils"),
    unzip = require('unzip'), // for zip compression (.CBZ)
    unrar = require('unrar'); // for Rar compression( .CBR )

//=============================================================================
function cComicScanner(i_sBasePath) {

    //=============================================================================
    // Public Members
    //=============================================================================

    //=============================================================================
    // Public methods
    //=============================================================================
    this.BASE_PATH = i_sBasePath || config.data.paths.comics;

    //=============================================================================
    this.scanComics = function(i_oCallback) {
        var l_oSelf = this;

        fs.readdir(this.BASE_PATH, function(err, i_aFiles) {
            _scanGroups(err, i_aFiles, l_oSelf.BASE_PATH, function() {
                i_oCallback(m_oScannedGroups);
            });
        });
    };

    //=============================================================================
    // Private methods
    //=============================================================================

    //=============================================================================
    function _scanGroups(err, i_aFiles, i_sPath, i_oCallback) {
        var i = -1,
            l_oNextFile;

        if (err) {
            console.log("ComicScanner::_scanGroups::Error listing folder: ", err);
            return;
        }

        l_oNextFile = function() {
            i++;
            if (i < i_aFiles.length)
                _scanGroup(i_aFiles[i], i_sPath, l_oNextFile);
            else
                i_oCallback();
        };

        l_oNextFile();
    }

    //=============================================================================
    function _scanGroup(i_sFileName, i_sPath, i_oCallback) {
        console.log("ComicScanner::_scanGroup::Input ", i_sFileName, i_sPath);
        var l_sFullPath = path.join(i_sPath, i_sFileName);
        console.log("ComicScanner::_scanGroup::Analyzing ", l_sFullPath);

        fs.stat(l_sFullPath, function(err, i_oStats) {
            if (i_oStats.isDirectory()) {
                console.log("Directory detected, Creating group [", i_sFileName, "] and scanning ", l_sFullPath, "...");
                m_oScannedGroups[i_sFileName] = []; // create group structure here
                fs.readdir(l_sFullPath, function(err, i_aFiles) {
                    _processScanFiles(err, i_aFiles, l_sFullPath, m_oScannedGroups[i_sFileName], i_oCallback);
                });
            }
        });
    }

    //=============================================================================
    function _processScanFiles(err, i_aFiles, i_sPath, i_aGroup, i_oCallback) {
        var i = -1,
            l_oNextFile;

        if (err) {
            console.log("ComicScanner::_processScanFiles::Error listing folder: ", err);
            return;
        }

        l_oNextFile = function() {
            i++;
            if (i < i_aFiles.length)
                _processScannedFile(i_aFiles[i], i_sPath, i_aGroup, l_oNextFile);
            else
                i_oCallback();
        };

        l_oNextFile();
    }

    //=============================================================================
    function _processScannedFile(i_sFileName, i_sPath, i_aGroup, i_oCallback) {
        console.log("ComicScanner::_processScannedFile::Input ", i_sFileName, i_sPath);
        var l_sFullPath = path.join(i_sPath, i_sFileName);
        console.log("ComicScanner::_processScannedFile::Analyzing ", l_sFullPath);

        fs.stat(l_sFullPath, function(err, i_oStats) {
            if (i_oStats.isDirectory()) {
                console.log("Directory detected, digging down...");

                fs.readdir(l_sFullPath, function(err, i_aFiles) {
                    _processScanFiles(err, i_aFiles, l_sFullPath, i_aGroup, i_oCallback);
                });
            } else {
                i_aGroup.push({path: l_sFullPath, size: i_oStats.size});
                i_oCallback();
            }
        });
    }

    //=============================================================================
    // Private Members
    //=============================================================================
    var m_oScannedGroups = {};

} // END OF CLASS

module.exports = cComicScanner; // return instance ?
