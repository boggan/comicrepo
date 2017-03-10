/*
 * Name: NetworkMgr
 * Description: Class used to handle network requests
 * Author: Thomas Lanteigne
 * Date: 17 Oct 2015
 */
var path = require("path"),
    fs = require("fs"),
    restify = require("restify"),
    config = require("../config"),
    Utils = require("./Utils");

function cNetworkMgr(i_oComicRepoApp) {
    //=============================================================================
    // Public methods
    //=============================================================================
    this.startServer = function() {
        console.log("NetworkMgr::startServer::Starting Server...");
        m_oServer = restify.createServer({
            name: 'ComicRepo'
        });

        //gzip compression
        // m_oServer.use(restify.gzipResponse());
        //query string parser
        m_oServer.use(restify.queryParser());
        m_oServer.listen(config.network.server_port);

        // handle all file requests, ie: URLs starting with /API/...
        m_oServer.get(/^(?!\/API)/, _httpFileResponse);

        // handle all API requests, ie: all other URLs
        m_oServer.get(/^\/API\/(\w+)?(?:\/(.*))?/i, _httpAPIResponse);
    };

    //=============================================================================
    this.stopServer = function() { // used ?

    };

    //=============================================================================
    // Private methods
    //=============================================================================
    //
    //=============================================================================
    function _httpAPIResponse(i_oReq, i_oRes, i_oNext) {
        console.log("cComicRepoApp::_httpAPIResponse::API Request for file ", i_oReq.url, i_oReq.params);
        var l_sMsg = "API Request for file " + i_oReq.url + " Params: " + JSON.stringify(i_oReq.params);

        if (/list/i.test(i_oReq.params[0])) {
            console.log("List API called");
            if (i_oReq.params[1]) {
                console.log("List Comics by id ", i_oReq.params[1], " API called");
                /**** Call To ComicRepo App / EVENT NOTIFICATIONS ****/
                // list comics by group id i_oReq.params[1]
                m_oComicRepoApp.listComics(i_oReq.params[1], function(i_aList) {
                    _httpResponse(JSON.stringify(i_aList), i_oReq, i_oRes, i_oNext);
                });

                /**** EVENT NOTIFICATIONS ****/

            } else {
                // list groups
                console.log("List Groups API called");

                /**** EVENT NOTIFICATIONS ****/
                m_oComicRepoApp.listGroups(function(i_aList) {
                    _httpResponse(JSON.stringify(i_aList), i_oReq, i_oRes, i_oNext);
                });
                /**** EVENT NOTIFICATIONS ****/

            }
        } else if (/loadcomic/i.test(i_oReq.params[0])) {
            // get comic by id i_oReq.params[1]
            var l_aParams = i_oReq.params[1].split('/');
            console.log("cComicRepoApp::_httpAPIResponse::******** Accessing comic : ", l_aParams);

            /**** EVENT NOTIFICATIONS ****/
            m_oComicRepoApp.ExtractComicById(l_aParams[0], l_aParams[1], function(i_oComic, i_sGroupId, i_sId) {
                console.log("cComicRepoApp::_httpAPIResponse:: ********* Found comic by GroupId/Id ", i_sGroupId, i_sId, i_oComic);

                _httpResponse(JSON.stringify(i_oComic), i_oReq, i_oRes, i_oNext);
            });
            /**** EVENT NOTIFICATIONS ****/
        } else if (/comic/i.test(i_oReq.params[0])) {
            // get comic by id i_oReq.params[1]
            var l_aParams = i_oReq.params[1].split('/');
            console.log("cComicRepoApp::_httpAPIResponse::Accessing comic : ", l_aParams);

            /**** EVENT NOTIFICATIONS ****/
            m_oComicRepoApp.findComicById(l_aParams[0], l_aParams[1], function(i_oComic, i_sGroupId, i_sId) {
                console.log("cComicRepoApp::_httpAPIResponse::Found comic by GroupId/Id ", i_sGroupId, i_sId, i_oComic);

                _httpResponse(JSON.stringify(i_oComic), i_oReq, i_oRes, i_oNext);
            });
            /**** EVENT NOTIFICATIONS ****/
        } else {
            _httpResponse(l_sMsg, i_oReq, i_oRes, i_oNext);
        }
    }

    //=============================================================================
    function _httpFileResponse(i_oReq, i_oRes, i_oNext) {

        console.log("File Request for file ", i_oReq.url);

        var l_sRequestURL = decodeURIComponent(i_oReq.url),
            l_sMsg = "File Request for file " + l_sRequestURL,
            l_sFilePath;

        l_sRequestURL = l_sRequestURL.replace(/\?.*/, ""); // strip out any query string arguments
        if (/\/$/i.test(l_sRequestURL))
            l_sRequestURL += "/index.html";
        else if (/\/favicon.ico/.test(l_sRequestURL))
            l_sRequestURL = "/assets/images/favicon.ico";

        // comic data
        if (/^\/data\/.*?.(jpg|png|gif|cb[zr])/i.test(l_sRequestURL)) {
            l_sFilePath = path.resolve(["./", l_sRequestURL].join('/'));
        } else {
            // regular resource -- client or admin
            if (/^\/admin/i.test(l_sRequestURL)) {
                console.log("\n\n\n ADMIN REQUEST ->", l_sRequestURL, "<-\n\n\n");
                l_sRequestURL = l_sRequestURL.replace(/^\/admin/i, "");
                l_sFilePath = path.resolve([config.admin_web_path, l_sRequestURL].join('/'));
            } else {
                console.log("\n\n\n CLIENT REQUEST ->", l_sRequestURL, "<-\n\n\n");
                l_sFilePath = path.resolve([config.client_web_path, l_sRequestURL].join('/'));
            }
        }

        l_sFilePath = decodeURI(l_sFilePath); // make sure string is decoded
        fs.readFile(l_sFilePath, function(err, i_oData) {
            var l_sExt = path.extname(l_sFilePath);

            if (err) {
                console.error("cComicRepoApp::_httpFileResponse::Error reading file ", l_sFilePath, err);
                i_oReq.url = "404.html";
                _httpFileResponse(i_oReq, i_oRes, i_oNext);
            } else {
                console.log("File read: ", l_sFilePath, " Extention: ", l_sExt);
                fs.stat(l_sFilePath, function(err, i_oStats) {
                    // console.log("File stat: ", i_oStats);

                    l_sMime = m_oMimeTypes[l_sExt];
                    if (!l_sMime) {
                        l_sMime = m_oMimeTypes.default;
                    }

                    i_oRes.writeHead(200, {
                        'Content-Type': l_sMime,
                        'Content-Length': i_oStats.size, // causes problems with gzip
                        'Server': "Homemade Goodness"
                    });
                    // console.log( "cComicRepoApp::_httpFileResponse::Setting mimetype of response to ", l_sMime );
                    if (/^text|javascript/.test(l_sMime)) {
                        l_sMsg = String(i_oData);
                    } else { /* if(/^image\//i.test( l_sMime )) */
                        l_sMsg = i_oData;
                    }

                    _httpResponse(l_sMsg, i_oReq, i_oRes, i_oNext);
                });
            }
        });
    }

    //=============================================================================
    function _httpResponse(i_oMsg, i_oReq, i_oRes, i_oNext) {
        i_oRes.end(i_oMsg);
        return i_oNext();
    }

    //=============================================================================
    // Private Members
    //=============================================================================
    var m_oServer,
        m_oComicRepoApp = i_oComicRepoApp,
        m_oMimeTypes = {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.css': 'text/css',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.woff': 'application/x-font-woff',
            '.woff2': 'application/x-font-woff2',
            '.ttf': 'application/x-font-ttf',
            '.otf': 'application/x-font-opentype',
            '.eot': 'application/vnd.ms-fontobject',
            '.cbr': 'application/x-cbr', // 'application/octet-stream'
            '.cbz': 'application/x-cbz',
            '.txt': 'text/plain',
            default: 'text/plain'
        };
}

module.exports = cNetworkMgr;
