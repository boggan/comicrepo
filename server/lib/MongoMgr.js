var fs = require("fs"),
    mongoose = require("mongoose"),
    config = require("../config"),
    Utils = require("./Utils");

//=============================================================================
function cMongoMgr() {

    //=============================================================================
    // Public Members
    //=============================================================================

    //=============================================================================
    // Public methods
    //=============================================================================

    //=============================================================================
    this.connect = function(i_oCallback) {
        mongoose.connect(config.network.mongodb_server);
        m_oDBHandle = mongoose.connection;
        m_oDBHandle.on('error', function(err) {
            console.error("cMongoMgr::connect::connection error:", err);
            i_oCallback(false);
        });

        m_oDBHandle.once('open', function(args) {
            console.log("cMongoMgr::connect::Connected to MongoDB @ ", config.network.mongodb_server);
            _InitializeSchemasAndModels();
            i_oCallback(true);
        });
    };

    //=============================================================================
    this.disconnect = function() {
        if (m_oDBHandle) {
            console.log("cMongoMgr::disconnect::Disconnecting... ");
            m_oDBHandle.close();
        }
    };

    //=============================================================================
    this.addGroup = function(i_sName, i_oCallback) {
        var l_oGroupModel = new m_oComicGroupModel({
            name: i_sName
        });
        l_oGroupModel.save(function(i_oError) {
            if (i_oError) {
                l_oGroupModel = null;
                console.error("cMongoMgr::addGroup::Error saving new comic group: ", i_sFilePath, "Error: ", i_oError);
            }

            if (i_oCallback)
                i_oCallback(l_oGroupModel);
        });
    };

    // add comic to group
    //=============================================================================
    this.addComicToGroup = function(i_oGroup, i_oComicData, i_aPages, i_sThumbnail, i_sCoverPage, i_oCallback) {
        var l_sFilePath = i_oComicData.path,
            l_oMatchData = l_sFilePath.match(/.*\/.*?(\d+)(?:\.)?.*$/),
            l_nIssue = 0;

        // .replace(/\(.*?\)|\s+/g, "_")

        // comics/Preacher (Complete)/noAds/Preacher 01 (1995) (noAds) (theProletariat-DCP).cbr
        // comics/The.Walking.Dead/01.days_gone_bye.001-006/002.cbz
        // comics/The Sandman/Sandman 064 (1994) (digital) (Son of Ultron-Empire).cbr
        // comics/Sin City Comics/That Yellow Bastard/Sin City - That Yellow Bastard 6.cbr
        if (l_oMatchData) {
            l_nIssue = Number(l_oMatchData[1]);
        }

        console.log("cMongoMgr::addComic::Adding comic to group ", i_oGroup.name, l_sFilePath, i_sThumbnail, i_sCoverPage, i_aPages.length);

        // group is existing, lets add the comic to the group
        i_oGroup.comics.push({
            groupId: i_oGroup._id,
            filename: i_oComicData.path,
            thumbnail: i_sThumbnail,
            coverPage: i_sCoverPage,
            size: i_oComicData.size,
            // pages: [],
            issue: l_nIssue
        });
        i_oGroup.nbIssues = i_oGroup.comics.length;
        i_oGroup.save(function(i_oError) {
            console.error("cMongoMgr::addComic::Group saved with new comic Filename: ", l_sFilePath, "Error: ", i_oError);
            // --- cut here ?? ---
            var l_bSucceeded = true;
            if (i_oError) {
                l_bSucceeded = false;
                console.error("cMongoMgr::addComic::Error saving new comic Filename: ", l_sFilePath, "Error: ", i_oError);
            }

            if (i_oCallback)
                i_oCallback(l_bSucceeded);
            // --- cut here ?? ---
        });
    };

    // TO IMPLEMENT PROPERLY
    //=============================================================================
    this.removeComic = function(i_sFilePath) {
        // this.findComicByPath( i_sFilePath, _removeComic );
    };

    /*
    Finding a sub-document

    Each document has an _id. DocumentArrays have a special id method for looking up a document by its _id.

    var doc = parent.children.id(id);
    */
    //=============================================================================
    this.findComicById = function(i_sGroupId, i_sId, i_oCallback) {
        m_oComicGroupModel.findOne({
            _id: i_sGroupId
        }, function(err, i_oComicGroup) {
            var l_oComic = null;
            if (err)
                console.error("cMongoMgr::findComicById::Error trying to locate by group id ", i_sGroupId, " Error: ", err, i_oComicGroup);

            if (i_oComicGroup)
                l_oComic = i_oComicGroup.comics.id(i_sId);
            i_oCallback(l_oComic, i_sGroupId, i_sId);
        });
    };

    //=============================================================================
    this.findComicByPathForGroup = function(i_oGroup, i_sComicPath) {
        var l_oFoundComic = i_oGroup.comics.filter(function(i_oComic) {
            return i_oComic.filename === i_sComicPath;
        }).pop();

        console.log("cMongoMgr::findComicByPathForGroup::Found Comic : ", l_oFoundComic);
        return l_oFoundComic;
    };

    //=============================================================================
    this.findGroupByName = function(i_sName, i_oCallback) {
        m_oComicGroupModel.findOne({
            name: i_sName
        }, function(err, i_oComicGroup) {
            if (err)
                console.error("cMongoMgr::findGroupByName::Error trying to locate group by name ", i_sName, " Error: ", err);

            i_oCallback(i_oComicGroup);
        });
    };

    //=============================================================================
    this.listGroups = function(i_oCallback) {
        m_oComicGroupModel.find({}, function(i_oErr, i_aList) {
            for (var i = 0; i < i_aList.length; i++) {
                console.log("ComicGroup Found: ", i_aList[i].name, i_aList[i].comics.length, i_aList[i]._id);
            }

            i_oCallback(i_aList);
        });
    };

    //=============================================================================
    this.listComics = function(i_sGroupId, i_oCallback) {
        m_oComicGroupModel.findOne({
            _id: i_sGroupId
        }, function(i_oErr, i_oGroup) {
            var l_aList = [];
            if (i_oGroup) {
                l_aList = i_oGroup.comics.concat();

                l_aList.sort(function(i_oComicA, i_oComicB) {
                    return i_oComicA.issue < i_oComicB.issue ? -1 : 1;
                });

                for (var i = 0; i < l_aList.length; i++) {
                    console.log("Comic Found: ", l_aList[i].issue, l_aList[i].filename, l_aList[i]._id);
                }
            }

            i_oCallback(l_aList);
        });
    };

    //=============================================================================
    this.flushComics = function() {
        m_oComicGroupModel.find({}, function(i_oErr, i_aList) {
            for (var i = 0; i < i_aList.length; i++) {
                _removeComic(i_aList[i]);
            }
        });
    };

    //=============================================================================
    // Private methods
    //=============================================================================
    function _InitializeSchemasAndModels() {
        var l_aModels,
            l_oComicGroupSchema,
            l_oComicSchema;

        // init comic model
        l_aModels = m_oDBHandle.modelNames();
        console.log("cMongoMgr::_InitializeSchemasAndModels::Existing DB Models...", l_aModels);

        // Checking if schemas are defined
        if (l_aModels.indexOf('ComicModel') < 0) {
            // init comic schema
            console.log("cMongoMgr::_InitializeSchemasAndModels::Creating DB Comic Schema... ");
            l_oComicSchema = mongoose.Schema({
                groupId: String,
                filename: String,
                thumbnail: String,
                coverPage: String,
                size: Number,
                // state ?
                // pages: [String],
                issue: Number
            });

            // init comic group schema
            console.log("cMongoMgr::_InitializeSchemasAndModels::Creating DB ComicGroup Schema... ");
            l_oComicGroupSchema = mongoose.Schema({
                name: String,
                nbIssues: Number,
                comics: [l_oComicSchema]
            });

            console.log("cMongoMgr::_InitializeSchemasAndModels::Creating ComicGroup Model...");
            m_oComicGroupModel = mongoose.model('ComicGroupModel', l_oComicGroupSchema);
        } else {
            m_oComicModel = mongoose.model('ComicModel');
            m_oComicGroupModel = mongoose.model('ComicGroupModel');
        }
    }

    // TO IMPLEMENT
    //=============================================================================
    function _removeComic(i_oComic) {
        if (i_oComic) {
            console.log("cMongoMgr::removeComic::Found comic to remove: ", i_oComic.filename);
            // remove thumbnail file
            console.log("cMongoMgr::removeComic::Removing thumbnail ", i_oComic.thumbnail);
            if (i_oComic.thumbnail) {
                fs.unlink(i_oComic.thumbnail, function(i_oError) {
                    if (i_oError)
                        console.log("cMongoMgr::removeComic::Error removing thumbnail ", i_oComic.thumbnail);
                    i_oComic.remove(_onComicRemoved);
                });
            } else {
                i_oComic.remove(_onComicRemoved);
            }
        }
    }

    //=============================================================================
    function _onComicRemoved(i_oError) {
        // var l_bSucceeded = false;

        if (i_oError) {
            console.error("cMongoMgr::removeComic::Error removing comic Filename: Error: ", i_oError);
        } else {
            // l_bSucceeded = true;
            console.log("cMongoMgr::removeComic::Successfully removed comic : ", i_oError);
        }
        // i_oCallback( l_bSucceeded );
    }

    //=============================================================================
    // Private members
    //=============================================================================
    var m_oDBHandle,
        m_oComicGroupModel,
        m_oComicModel;
}

// export instance of utils
module.exports = cMongoMgr;
