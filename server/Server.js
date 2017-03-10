var fs = require('fs'),
    path = require('path'),
    // events = require("events").EventEmitter
    config = require('./config.js'),
    Utils = require('./lib/Utils'),
    NetworkMgr = require('./lib/NetworkMgr'),
    MongoMgr = require("./lib/MongoMgr"),
    Unpacker = require("./lib/Unpacker"),
    ThumbnailGenerator = require("./lib/ThumbnailGenerator"),
    ComicScanner = require("./lib/ComicScanner");

/*
  NEEDED:
    API.js // API Manager -- clear API entrypoints
    NetworkMgr.js ? // Restify stuff ?
  DONE:
   Utils -> common utility functions (ie: create temp directory, generate random string, etc... )
   ComicScanner -> takes care of scanning for all cbr/cbz files
   ThumbnailGenerator -> takes a single CBZ/CBR file, extract the first file and generate a thumbnail for it
   ComicManager -> takes care of managing the comics in the Mongo database
*/

//=============================================================================
// MAIN CLASS
//=============================================================================
function cComicRepoApp() {
    //=============================================================================
    // Public Members
    //=============================================================================

    //=============================================================================
    // Public methods
    //=============================================================================
    this.start = function() {
        m_oMongoMgr.connect(_onDBConnected);
    };

    //=============================================================================
    this.listGroups = function(i_oCallback) {
        m_oMongoMgr.listGroups(function(i_aGroups) {
            // strip out extra members
            var i = 0;
            for (i = 0; i < i_aGroups.length; i++) {
                if (i_aGroups[i].comics.length > 3)
                    i_aGroups[i].comics.length = 3; // no need to provide comics list when listing groups // or only keep the first 3 ?
            }

            i_oCallback(i_aGroups);
        });
    };

    // unless admin ? use same entry point ?
    //=============================================================================
    this.listComics = function(i_sGroupId, i_oCallback) {
        m_oMongoMgr.listComics(i_sGroupId, function(i_aComicList) {
            i_oCallback(_filterComics(i_aComicList));
        });
    };

    // rename to readComic ? getComicById ? loadComicById ?
    //=============================================================================
    this.findComicById = function(i_sGroupId, i_sId, i_oCallback) {
        var l_oComicModelData;
        m_oMongoMgr.findComicById(i_sGroupId, i_sId, function(i_oComicModel) {
            if (!i_oComicModel) {
                i_oComicModel = {
                    ERROR: "Invalid comic id specified."
                };
                i_oCallback(i_oComicModel);
            } else {
                l_oComicModelData = i_oComicModel.toJSON();
                if (m_oUnpackedComics[i_oComicModel.filename]) {
                    // touch lifetime
                    m_oUnpackedComics[i_oComicModel.filename].lastUpdate = new Date().getTime();
                    l_oComicModelData.pages = m_oUnpackedComics[i_oComicModel.filename].pages; // create clone ?
                    l_oComicModelData.thumbnailsMap = m_oUnpackedComics[i_oComicModel.filename].thumbnailsMap;
                    i_oCallback(l_oComicModelData);
                } else {
                    _unpackComicToTmpFolder(l_oComicModelData, false, i_oCallback);
                }
            }
        });
    };

    //=============================================================================
    this.ExtractComicById = function(i_sGroupId, i_sId, i_oCallback) {
        var l_oComicModelData,
            l_oCachedComicData;
        m_oMongoMgr.findComicById(i_sGroupId, i_sId, function(i_oComicModel) {
            if (!i_oComicModel) {
                i_oComicModel = {
                    ERROR: "Invalid comic id specified."
                };
                i_oCallback(i_oComicModel);
            } else {
                l_oComicModelData = i_oComicModel.toJSON();
                l_oCachedComicData = m_oUnpackedComics[i_oComicModel.filename];
                if (l_oCachedComicData) {
                    console.log("Server::ExtractComicById::Comic already unpacked! ", m_oUnpackedComics[i_oComicModel.filename]);
                    // touch lifetime
                    l_oCachedComicData.lastUpdate = new Date().getTime();
                    l_oComicModelData.pages = l_oCachedComicData.pages; // create clone ?
                    l_oComicModelData.thumbnailsMap = l_oCachedComicData.thumbnailsMap;
                    i_oCallback(l_oComicModelData);
                } else {
                    _unpackComicToTmpFolder(l_oComicModelData, true, i_oCallback);
                }
            }
        });
    };

    //=============================================================================
    this.flushDB = function() {
        m_oMongoMgr.flushComics();
    };

    //=============================================================================
    // Private Methods
    //=============================================================================

    //=============================================================================
    function _filterComics(i_aComics) {
        var l_aFilteredList = [];

        i_aComics.forEach(function(i_oComic) {
            if (i_oComic.size <= config.data.listing_max_file_size) {
                l_aFilteredList.push(i_oComic);
            } else {
                console.log("Comic Filtered, archive too big: ", i_oComic.filename, " Size: ", i_oComic.size, " > ", config.data.listing_max_file_size);
            }
        });

        return l_aFilteredList;
    }

    //=============================================================================
    function _onDBConnected(i_bConnected) {
        if (i_bConnected) {
            console.log("cComicRepoApp::_onDBConnected::Connected to the database");

            // console.log("cComicRepoApp::_onDBConnected::Flushing Database...");
            // m_oInterface.flushDB();
            console.log("cComicRepoApp::_onDBConnected::Scanning comics...");
            m_oComicScanner.scanComics(_onComicsScanned);
        } else {
            console.error("cComicRepoApp::_onDBConnected::Error connecting to database");
        }
    }

    //=============================================================================//
    function _onComicsScanned(i_oScannedGroups) {
        var i,
            l_sGroupName,
            l_aGroupComics;

        console.log("cComicRepoApp::_onComicsScanned::List of comics found: ", i_oScannedGroups);

        for (l_sGroupName in i_oScannedGroups) {
            _processGroup(l_sGroupName, i_oScannedGroups[l_sGroupName], _removeUnpackedGroupFolder);
        }

        // start when all comics were added ?
        _startWatchdog();
        m_oNetworkMgr.startServer();
        //m_oInterface.flushDB();
    }

    //=============================================================================
    function _removeUnpackedGroupFolder(i_oComicGroup) {
        var l_sFolder = [config.data.paths.unpacked_comics, i_oComicGroup.name].join('/');
        fs.rmdir(l_sFolder, function(i_oError) {
            if (i_oError) {
                console.log("cComicRepoApp::_removeUnpackedGroupFolder::Error removing folder ", l_sFolder, " Error: ", i_oError.message);
            }
        });
    }

    //=============================================================================
    function _startWatchdog() {
        console.log("cComicRepoApp::Starting Watchdog...");

        // filesystem watch for new arrivals / suppressions
        // -- setup recursive watch on fs.watch(config.data.paths.comics, { persistent: true, recursive: true }, function(event, filename) { process file, add group ? or comic ? });

        _watchComics();
        // cleanup watchdog
        setInterval(_cleanUpComics, config.data.unpacked.watchdogInterval);
    }

    //=============================================================================
    function _watchComics() {
        // watch root of comics folder -- for new volumes being added
        m_oComicsRootWatcher = fs.watch(config.data.paths.comics, function(event, filename) {
            var l_sAbsolutePath = path.join(config.data.paths.comics, filename);
            // create/delete event ==> rename
            fs.stat(l_sAbsolutePath, function(i_oError, i_oStats) {
                if (i_oError) {
                    console.log("File removed: ", l_sAbsolutePath);
                } else {
                    console.log(" File Stats for ", l_sAbsolutePath, "\n IsDirectory: ", i_oStats.isDirectory());
                }

            });

        });
    }

    //=============================================================================
    function _cleanUpComics() {
        var l_dNow = new Date().getTime(),
            l_sComicFilePath,
            l_oUnpackedData;

        for (l_sComicFilePath in m_oUnpackedComics) {
            l_oUnpackedData = m_oUnpackedComics[l_sComicFilePath];
            if (l_dNow - l_oUnpackedData.lastUpdate >= config.data.unpacked.lifetime) {
                // unlink folder
                delete m_oUnpackedComics[l_sComicFilePath];
                console.log("cComicRepoApp::_cleanUpComics::Cleaning up comics for ", l_sComicFilePath);
                _removeUnpackedComic(l_oUnpackedData);
            }
        }
    }

    //=============================================================================
    function _removeUnpackedComic(i_oUnpackedData, i_oCallback) {
        var l_aPromises = [];

        i_oUnpackedData.pages.forEach(function(i_sPagePath) {
            l_aPromises.push(new Promise(function(i_oResolve) {
                fs.unlink(i_sPagePath, function(i_oError) {
                    if (i_oError) {
                        console.error("Error removing file : ", i_sPagePath);
                    }
                    i_oResolve();
                });
            }));
        });

        Promise.all(l_aPromises).then(function() {
            console.log("\n\n\n\n REMOVING UNPACKED DATA OUTPUT DIR \n\n\n");
            fs.unlink(i_oUnpackedData.outdir, function() {
                if (i_oCallback) {
                    i_oCallback();
                }
            });
        });
    }

    //=============================================================================
    function _processGroup(i_sGroupName, i_aComicList, i_oCallback) {
        // will need to chain this?
        console.log("cComicRepoApp::_processGroup::Processing group : ", i_sGroupName);

        // check if group exists
        m_oMongoMgr.findGroupByName(i_sGroupName, function(i_oComicGroup) {
            console.log("cComicRepoApp::_processGroup::group found : ", (i_oComicGroup !== null), i_aComicList);
            if (i_oComicGroup) {
                _addComicsToGroup(i_oComicGroup, i_aComicList, i_oCallback);
            } else {
                // add group
                m_oMongoMgr.addGroup(i_sGroupName, function(i_oComicGroup) {
                    _addComicsToGroup(i_oComicGroup, i_aComicList, i_oCallback);
                });
            }
        });
    }

    //=============================================================================
    function _addComicsToGroup(i_oComicGroup, i_aComicList, i_oCallback) {
        var i = -1,
            l_oNext;

        l_oNext = function() {
            i++;
            if (i < i_aComicList.length) {
                _processComic(i_oComicGroup, i_aComicList[i], l_oNext); // hook up callbacks ?
            } else {
                if (i_oCallback) {
                    i_oCallback(i_oComicGroup);
                }
            }
        };

        l_oNext();
    }

    //=============================================================================
    function _processComic(i_oComicGroup, i_oComicData, i_oCallback) {
        // check if comics are in the DB
        var l_sFilePath = i_oComicData.path,
            l_oComic = m_oMongoMgr.findComicByPathForGroup(i_oComicGroup, l_sFilePath);

        console.log("cComicRepoApp::_addComicsToGroup::comic found ? : ", l_oComic, " for path ", l_sFilePath);
        if (!l_oComic) {
            console.log("cComicRepoApp::_addComicsToGroup::adding comic : ", l_sFilePath, " to group ", i_oComicGroup.name);
            // unpack archive
            _unpackComic(i_oComicGroup, i_oComicData)
                .then(_generateComicThumbnail)
                .then(_cleanUpPages)
                .then(_addComicToGroup)
                .then(i_oCallback);
        } else {
            i_oCallback();
        }
    }

    //=============================================================================
    function _unpackComic() {
        return Utils.reflectPromisedFunction(_unpackComic_internal, arguments);
    }

    //=============================================================================
    function _unpackComic_internal(i_oComicGroup, i_oComicData, i_oCallback) {
        var l_sOutputDir = [config.data.paths.unpacked_comics, i_oComicGroup.name].join('/');
        console.log("\n\n\n\n\n UNPACKING COMIC " + i_oComicGroup.name + " TO " + l_sOutputDir + "\n\n\n\n");
        Unpacker.unpack(i_oComicData.path, l_sOutputDir, i_oCallback);
    }

    //=============================================================================
    function _generateComicThumbnail(i_aArguments) {
        return Utils.reflectPromisedFunction(_generateComicThumbnail_internal, i_aArguments);
    }

    //=============================================================================
    function _generateComicThumbnail_internal(i_oComicGroup, i_oComicData, i_aPages, i_oCallback) {
        // if they're not in the DB, generate thumbnail, then add to DB
        if (i_aPages) {
            m_oThumbnailGenerator.generateThumbnail(i_aPages, function(i_oError, i_sThumbnailPath, i_sCoverPage) {
                if (!i_oError && i_sThumbnailPath) {
                    console.log("cComicRepoApp::_generateComicThumbnail::Thumbnail generated for ", i_oComicData.path);
                    i_oCallback(i_sThumbnailPath, path.basename(i_sCoverPage));
                } else {
                    console.log("cComicRepoApp::_generateComicThumbnail::Error generating thumbnail for ", i_oComicData.path, " Error: ", i_oError);
                    i_oCallback(null, null);
                }
            });
        } else {
            i_oCallback(null, null);
        }
    }

    //=============================================================================
    function _cleanUpPages(i_aArguments) {
        return Utils.reflectPromisedFunction(_cleanUpPages_internal, i_aArguments);
    }

    //=============================================================================
    function _cleanUpPages_internal(i_oComicGroup, i_oComicData, i_aPages, i_sThumbnailPath, i_sCoverPage, i_oCallback) {
        var l_aPromises = [],
            l_sParentFolder;

        i_aPages.forEach(function(i_sPagePath) {
            l_aPromises.push(new Promise(function(i_oResolve) {
                // unlink page path
                fs.unlink(i_sPagePath, function(i_oError) {
                    if (i_oError) {
                        console.log("cComicRepoApp::_cleanUpPages_internal::Error removing page ", i_sPagePath);
                    }

                    i_oResolve();
                });
            }));
        });

        Promise.all(l_aPromises).then(function() {
            // check if parent folder is empty, if so, remove it
            // remove parent folder
            l_sParentFolder = path.dirname(i_aPages[0]);
            if (l_sParentFolder !== ".") {
                fs.rmdir(l_sParentFolder, function(i_oError) {
                    if (i_oError) {
                        console.log("cComicRepoApp::_cleanUpPages_internal::Error removing folder : ", l_sParentFolder);
                    }

                    console.log("cComicRepoApp::_cleanUpPages_internal::Cleanup completed for ", i_oComicData.path, "...");
                    if (!i_oCallback) {
                        console.warn("ERROR NO CALLBACK SPECIFIED -- CoverPage? ", i_sCoverPage);
                    }
                    i_oCallback();
                });
            } else {
                i_oCallback();
            }
        });
    }

    //=============================================================================
    function _addComicToGroup(i_aArguments) {
        return Utils.reflectPromisedFunction(_addComicToGroup_internal, i_aArguments);
    }

    //=============================================================================
    function _addComicToGroup_internal(i_oComicGroup, i_oComicData, i_aPages, i_sThumbnailPath, i_sCoverPage, i_oCallback) {
        if (i_aPages) {
            m_oMongoMgr.addComicToGroup(i_oComicGroup, i_oComicData, i_aPages, i_sThumbnailPath, i_sCoverPage, function() {
                console.log("cComicRepoApp::_addComicToGroup_internal::Comic added ", i_oComicData.path);
                i_oCallback();
            });
        } else {
            i_oCallback();
        }
    }

    //=============================================================================
    function _unpackComicToTmpFolder(i_oComicModelData, i_bGenThumbnails, i_oCallback) {
        var l_sOutputDir;

        // unpack comic to temp dir ?
        // put pages in comic object
        l_sOutputDir = [config.data.paths.unpacked_comics, Utils.genRandomString()].join('/');
        fs.mkdir(l_sOutputDir, 0777, function(err, i_sPath) {
            // create output dir
            Unpacker.unpack(i_oComicModelData.filename, l_sOutputDir, function(i_aPages) {
                _sortPages(i_aPages, i_oComicModelData.coverPage);
                i_oComicModelData.pages = i_aPages; // create clone ?

                // or image map of all thumbnails ?
                m_oUnpackedComics[i_oComicModelData.filename] = {
                    outdir: l_sOutputDir,
                    pages: i_aPages,
                    lastUpdate: new Date().getTime()
                };

                if (i_bGenThumbnails) {
                    // generate thumbnails map
                    m_oThumbnailGenerator.GenerateThumbnailMap(i_aPages, l_sOutputDir, function(i_sThumbnailsMapPath) {
                        i_oComicModelData.thumbnailsMap = m_oUnpackedComics[i_oComicModelData.filename].thumbnailsMap = i_sThumbnailsMapPath;
                        i_oCallback(i_oComicModelData);
                    });
                } else {
                    // cache return + callback
                    i_oCallback(i_oComicModelData);
                }
            });
        });
    }

    //=============================================================================
    function _sortPages(i_aPages, i_sCoverPage) {
        var l_sCoverPagePath,
            l_nCoverPageIdx;

        console.log("Sorting comics ... ", i_sCoverPage);
        i_aPages.sort();

        console.log("Trying to locate cover page.... ", i_sCoverPage);
        l_sCoverPagePath = i_aPages.find(function(i_sPage) {
            return i_sPage.includes(i_sCoverPage);
        });
        console.log("Found cover page ", l_sCoverPagePath);

        if (l_sCoverPagePath) {
            i_aPages.splice(i_aPages.indexOf(l_sCoverPagePath), 1);
            i_aPages.unshift(l_sCoverPagePath);
        }

        i_aPages.forEach(function(page, idx) {
            console.log(idx, " Page: ", page);
        });
    }

    //=============================================================================
    function _constuctor_() {
        m_oNetworkMgr = new NetworkMgr(m_oInterface);
        m_oMongoMgr = new MongoMgr();
        m_oComicScanner = new ComicScanner();
        m_oThumbnailGenerator = new ThumbnailGenerator();
    }

    //=============================================================================
    // Private Members
    //=============================================================================
    var m_oInterface = this,
        m_oNetworkMgr,
        m_oMongoMgr,
        m_oThumbnailGenerator,
        m_oComicScanner,
        m_oUnpackedComics = {},
        m_oComicsRootWatcher;

    _constuctor_();
}


//=============================================================================
function main() {
    var l_oComicRepoApp = new cComicRepoApp();
    l_oComicRepoApp.start();
}

main();
