/*
 * Name: ThumbnailGenerator
 * Description: Class used to generate a thumbnail image based of a CBR/CBZ file
 * Author: Thomas Lanteigne
 * Date: 25 Nov 2014
 */

var fs = require("fs"),
    path = require("path"),
    gm = require("gm"),
    config = require("../config"),
    Utils = require("./Utils");

//=============================================================================
function cThumbnailGenerator() {

    //=============================================================================
    // Public Members
    //=============================================================================

    //=============================================================================
    // Public methods
    //=============================================================================
    this.generateThumbnail = function(i_aPages, i_oCallback) {
        _locateCoverPage(i_aPages, function(i_sCoverPage) {
            if (i_sCoverPage) {
                _generateThumbnail(i_sCoverPage, null, i_oCallback); // null means take folder from config
            } else {
                i_oCallback("No Cover Page Found", null);
            }
        });
    };

    // generate thumbnail map (single file) with JSON index ?
    //=============================================================================
    this.GenerateThumbnailMap = function(i_aPages, i_sDstFolderPath, i_oCallback) {
        var l_aPromises = [],
            l_sMapFilePath = i_sDstFolderPath + "/thumbmap.jpg";

        l_aPromises = i_aPages.map(i_sFilePath => {
            return new Promise(function(i_oResolve) {
                _generateThumbnail(i_sFilePath, i_sDstFolderPath, function(err, i_sThumbnailPath, i_sFilePath) {
                    i_oResolve({
                        error: err,
                        thumbnailPath: i_sThumbnailPath,
                        filePath: i_sFilePath
                    });
                });
            });
        });

        Promise.all(l_aPromises).then(function(i_aThumbnailData) {
            console.log("\n\n\n\n GENERATING THUMBMAIL MAP \n\n\n\n\n");
            // touch file
            fs.open(l_sMapFilePath, "wx", function(err, fd) {
                // handle error
                fs.close(fd, function(err) {
                    _buildMapFromThumbnails(i_aThumbnailData, l_sMapFilePath, i_oCallback);
                });
            });
        });
    };

    //=============================================================================
    // Private methods
    //=============================================================================

    //=============================================================================
    function _buildMapFromThumbnails(i_aThumbnailData, i_sMapFilePath, i_oCallback) {
        var l_oThumbnailData,
            l_oGMData = gm("");

        i_aThumbnailData.forEach(i_oThumbnailData => {
            l_oGMData = l_oGMData.montage(i_oThumbnailData.thumbnailPath);
        });

        l_oGMData.geometry("+2+2").write(i_sMapFilePath, function(err) {
            if (!err) {
                console.log("Written montage image.");
            }
            i_oCallback(i_sMapFilePath);
        });
    }

    //=============================================================================
    function _generateThumbnail(i_sFilePath, i_sDstPath, i_oCallback) {
        console.log("ThumbnailGenerator::_generateThumbnail::Called with ", i_sFilePath);
        var l_sExt = path.extname(i_sFilePath).toLowerCase(),
            l_sDstFolderPath = i_sDstPath || config.data.paths.thumbnails,
            l_sFileDirName = path.dirname(i_sFilePath),
            l_sThumbnailFileName = [Utils.genRandomString(), path.basename(i_sFilePath, l_sExt), "_THUMB", l_sExt].join(''),
            l_sThumbnailPath;

        // sanitize filename -- directory should be config.data.paths.unpacked_comics / volumename / thumbnail_file
        // extract volume name
        l_sFileDirName = l_sFileDirName.replace(config.data.paths.unpacked_comics, "").replace(/\/?(.*)?\/.*/, "$1");
        l_sFileDirName = [l_sDstFolderPath, l_sFileDirName].join('/');

        // assert folder existance
        fs.mkdir(l_sFileDirName, function() {
            l_sThumbnailFileName = l_sThumbnailFileName.replace(/\s|#/g, "_");
            l_sThumbnailPath = [l_sFileDirName, l_sThumbnailFileName].join('/');
            console.log("ThumbnailGenerator::_generateThumbnail::Resizing coverpage ", i_sFilePath, " to -> ", l_sThumbnailPath);

            // put width in config file...
            gm(i_sFilePath).resize(120).autoOrient().write(l_sThumbnailPath, function(err) {
                if (!err) console.log('ThumbnailGenerator::_generateThumbnail::hooray! Resize succeeded!');
                console.log("ThumbnailGenerator::_generateThumbnail::Thumbnail generated : ", l_sThumbnailPath);
                i_oCallback(err, l_sThumbnailPath, i_sFilePath);
            });
        });
    }

    //=============================================================================
    function _locateCoverPage(i_aFiles, i_oCallback) {
        var i,
            l_oMatchData,
            l_aCandidates = [],
            l_bCandidate = false,
            l_sCoverPagePath = null;

        console.log("ThumbnailGenerator::_locateCoverPage::Zip file closed...");
        console.log("ThumbnailGenerator::_locateCoverPage::Analyzing collected data... ");

        for (i = 0; i < i_aFiles.length; i++) {
            // console.log("ThumbnailGenerator::_locateCoverPage::Analyzing file : ", i_aFiles[i]);
            /*
               extract \d+
               cast to number, compare with 1 or 2
            */
            l_oMatchData = i_aFiles[i].match(/(\d+|fc|cover.*?)\.(jpg|png|gif)$/i);
            if (l_oMatchData) {
                if (!isNaN(l_oMatchData[1])) {
                    l_bCandidate = (Number(l_oMatchData[1]) <= 2); // we support 0, 1, 2 as possible page # for cover page
                } else {
                    l_bCandidate = true; // match on fc / cover
                }

                if (l_bCandidate) {
                    console.log("ThumbnailGenerator::_locateCoverPage::Found candidate file : ", i_aFiles[i]);
                    l_aCandidates.push(i_aFiles[i]);
                }
            }
        }

        if (l_aCandidates.length > 0) {
            // sort in order if numerical
            l_aCandidates.sort(function(i_sRCA, i_sRCB) {
                var l_nRC = 0,
                    l_oCoverMarkerRE = /fc|cover/i,
                    l_oDirectCoverRE = /(fc|cover)\.(.*)?$/i;

                if (l_oCoverMarkerRE.test(i_sRCA) || l_oCoverMarkerRE.test(i_sRCB)) {
                    if (l_oDirectCoverRE.test(i_sRCA)) {
                        l_nRC = -1;
                    } else if (l_oDirectCoverRE.test(i_sRCB)) {
                        l_nRC = 1;
                    }
                } else {
                    l_nRC = (i_sRCA < i_sRCB ? -1 : (i_sRCA > i_sRCB) ? 1 : 0);
                }

                console.log(i_sRCA, " VS ", i_sRCB, " => ", l_nRC);
                return l_nRC;
            });

            console.log("ThumbnailGenerator::_locateCoverPage::Cover page found: ", l_aCandidates[0]);
            l_sCoverPagePath = l_aCandidates[0];
        } else {
            l_sCoverPagePath = i_aFiles[0]; // failsafe, we end up with the first coverpage
        }

        // call callback with cover page here
        i_oCallback(l_sCoverPagePath);
    }

    //=============================================================================
    // Private Members
    //=============================================================================

} // end of class

module.exports = cThumbnailGenerator;
