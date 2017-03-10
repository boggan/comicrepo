define(['backbone', 'libs/bitjs/archive', '../collections/ComicPageCollection'], function(Backbone, bjs, ComicPageCollection) {
    return Backbone.Model.extend({
        id: "_id",
        urlRoot: "/API/comic",
        // urlRoot: "/API/loadcomic", // will generate thumbnail map
        defaults: {
            loadComplete: false,
            magnifyEnabled: false,
            currentPageIdx: 0
        },

        //=======================================================================
        initialize: function(options) {
            _.bindAll(this, '_updateProgress', '_complete');
            this.on('change:dualLayout', this.assertCurrentIdx, this);
            this.comicPageCollection = new ComicPageCollection(null, {
                parent: this
            });
            // for direct model fetch
            if (options._id)
                this.set('id', options._id);
            // need group id in order to find comic
            if (options.groupId)
                this.urlRoot = [this.urlRoot, options.groupId].join('/');
        },

        //=======================================================================
        loadComic: function() {
            var l_oSelf = this;
            // call comic API to extract comic
            this.fetch({
                success: function(i_oResult) {
                    console.log(" Comic Load Success called with: ", i_oResult);
                    // get current page idx first
                    l_oSelf._downloadPages();
                },
                error: function(i_oResult) {
                    console.log("\n\n *** ERROR LOADING COMIC *** ");
                }
            });

            // if (this.get("pages").length > 0) {
            //     this._downloadPages();
            // } else { // fallback to legacy method of unpacking archive client-side
            //     // use bitjs to extract archive ?
            //     this._loadArchive(this._processArchiveData);
            // }
        },

        //=======================================================================
        getCurrentPageModel: function() {
            return this.comicPageCollection.at(this.get('currentPageIdx'));
        },

        //=======================================================================
        getNextPageModel: function() {
            var l_nPageIdx = this.get('currentPageIdx') + 1;
            if (l_nPageIdx >= this.comicPageCollection.length) {
                l_nPageIdx = this.comicPageCollection.length - 1;
            }

            return this.comicPageCollection.at(l_nPageIdx);
        },

        //=======================================================================
        getPrevPageModel: function() {
            var l_nPageIdx = this.get('currentPageIdx') - 1;
            if (l_nPageIdx < 0) {
                l_nPageIdx = 0;
            }

            return this.comicPageCollection.at(l_nPageIdx);
        },

        //=======================================================================
        _downloadFile: function(i_sFilename, i_oOptions) {
            var l_sEventName,
                l_oXHR = new XMLHttpRequest();

            l_oXHR.open(i_oOptions.httpMethod, encodeURIComponent(i_sFilename));
            if (i_oOptions.responseType) {
                l_oXHR.responseType = i_oOptions.responseType;
            }

            for (l_sEventName in i_oOptions.events) {
                l_oXHR.addEventListener(l_sEventName, i_oOptions.events[l_sEventName]);
            }

            l_oXHR.onload = i_oOptions.onload;

            l_oXHR.send(null);
        },

        //=======================================================================
        _downloadPages: function() {
            var l_oSelf = this,
                l_aPages = this.get("pages"),
                l_aPromises = [];

            this.totalPages = l_aPages.length;
            this.totalPercentage = this.totalPages * 100;
            this.currentPercentage = 0;

            l_aPages.forEach(function(i_sPageURL) {
                if (/\.(jpe?g|gif|png)$/.test(i_sPageURL)) {
                    l_aPromises.push(this._downloadPage_Promise(i_sPageURL));
                } else {
                    this.currentPercentage += 100;
                }
            }, this);

            Promise.all(l_aPromises).then(function(i_aPageModels) {
                i_aPageModels.forEach(function(i_oImgData) {
                    l_oSelf._addToPageCollection(i_oImgData.filename, i_oImgData.blob);
                });
                l_oSelf.set('loadComplete', true);
            });
        },

        //=======================================================================
        _downloadPage_Promise: function(i_sFilename) {
            var l_oSelf = this;

            return new Promise(function(i_oResolve, i_oReject) {
                l_oSelf._downloadPage(i_sFilename, i_oResolve);
            });
        },

        //=======================================================================
        _downloadPage: function(i_sFilename, i_oCallback) {
            var l_oSelf = this,
                l_nTotal = 0,
                l_oDownloadOptions;

            l_oDownloadOptions = {
                httpMethod: "GET",
                responseType: "arraybuffer",
                events: {
                    progress: function(i_oEvent) {
                        if (i_oEvent.lengthComputable) {
                            var l_fPercentComplete = (i_oEvent.loaded / i_oEvent.total) * 100,
                                l_fTotalPercentage = ((l_oSelf.currentPercentage + l_fPercentComplete) / l_oSelf.totalPercentage) * 100;

                            // console.log( "ComicModel::_loadArchive::onreadystatechange::State changed ", l_oXHR.readyState, " status: ", l_oXHR.status, " Completion: ",l_fPercentComplete );
                            l_oSelf.set('loadProgress', (l_fTotalPercentage).toFixed(2));
                        }
                    },
                    load: function(i_oEvent) {
                        var l_fTotalPercentage;
                        l_oSelf.currentPercentage += 100;
                        l_fTotalPercentage = (l_oSelf.currentPercentage / l_oSelf.totalPercentage) * 100;

                        l_oSelf.set('loadProgress', (l_fTotalPercentage).toFixed(2));
                        console.log("ComicModel::_downloadPage::transfer complete");
                    },
                    error: function(i_oEvent) {
                        console.log("ComicModel::_downloadPage::Transfer failed");
                    },

                    abort: function(i_oEvent) {
                        console.log("ComicModel::_downloadPage::Transfer aborted");
                    }
                },
                onload: function(i_oXHREvent) {
                    var l_oResponse = i_oXHREvent.currentTarget.response;
                    console.log("Image Loaded: ", l_oResponse, l_oResponse.length);
                    i_oCallback({
                        filename: i_sFilename,
                        blob: l_oResponse
                    });
                }
            };

            this._downloadFile(i_sFilename, l_oDownloadOptions);
        },

        //=======================================================================
        _loadArchive: function(i_oCallback) {
            var l_sFilename = this.get('filename'),
                l_oArchive;

            if (l_sFilename) {
                // l_oArchive = sessionStorage.getItem( l_sFilename );
                // if( l_oArchive ) {
                //    this._processArchiveData( l_oArchive, l_sFilename );
                // }
                // else {
                this.set({
                    'loadType': 'download'
                });
                this._downloadArchive(l_sFilename);
                // }
            } else {
                // invalid comic model or error comic model ?
            }
        },

        //=======================================================================
        _downloadArchive: function(i_sFilename) {
            var l_oSelf = this,
                l_oDownloadOptions;

            l_oDownloadOptions = {
                httpMethod: "GET",
                responseType: "arraybuffer",
                events: {
                    progress: function(i_oEvent) {
                        if (i_oEvent.lengthComputable) {
                            var l_fPercentComplete = (i_oEvent.loaded / i_oEvent.total) * 100;
                            // console.log( "ComicModel::_loadArchive::onreadystatechange::State changed ", l_oXHR.readyState, " status: ", l_oXHR.status, " Completion: ",l_fPercentComplete );
                            l_oSelf.set('loadProgress', l_fPercentComplete.toFixed(2));
                        }
                    },
                    load: function(i_oEvent) {
                        console.log("ComicModel::_loadArchive::transfer complete"); // , keeping archive in session storage
                        // sessionStorage.setItem( i_sFilename, l_oXHR.response );
                    },
                    error: function(i_oEvent) {
                        console.log("ComicModel::_loadArchive::Transfer failed");
                    },

                    abort: function(i_oEvent) {
                        console.log("ComicModel::_loadArchive::Transfer aborted");
                    }
                },
                onload: function(i_oXHREvent) {
                    l_oSelf._processArchiveData(i_oXHREvent.currentTarget.response, i_sFilename);
                }
            };

            this._downloadFile(i_sFilename, l_oDownloadOptions);
        },

        //=======================================================================
        _processArchiveData: function(i_aByteArray, i_sFilename) {
            var l_oSelf = this,
                l_aUnarchivedFiles = [],
                l_oUnarchiver,
                l_aFileHeader;

            // FROM KTHOOM
            l_aFileHeader = new Uint8Array(i_aByteArray, 0, 10);
            if (l_aFileHeader[0] == 0x52 &&
                l_aFileHeader[1] == 0x61 &&
                l_aFileHeader[2] == 0x72 &&
                l_aFileHeader[3] == 0x21) { //Rar!
                l_oUnarchiver = new bitjs.archive.Unrarrer(i_aByteArray, "../libs/bitjs/");
            } else if (l_aFileHeader[0] == 80 &&
                l_aFileHeader[1] == 75) { //PK (Zip)
                l_oUnarchiver = new bitjs.archive.Unzipper(i_aByteArray, "../libs/bitjs/");
            } else { // Try with tar
                l_oUnarchiver = new bitjs.archive.Untarrer(i_aByteArray, "../libs/bitjs/");
            }
            // FROM KTHOOM

            // if( /cbz$/i.test( i_sFilename ) )
            //    l_oUnarchiver = new bitjs.archive.Unzipper(i_aByteArray, "../libs/bitjs/");
            // else
            //    l_oUnarchiver = new bitjs.archive.Unrarrer(i_aByteArray, "../libs/bitjs/");

            l_oUnarchiver.addEventListener(bitjs.archive.UnarchiveEvent.Type.PROGRESS, this._updateProgress);
            l_oUnarchiver.addEventListener(bitjs.archive.UnarchiveEvent.Type.FINISH, this._complete);

            // l_oUnarchiver.addEventListener(bitjs.archive.UnarchiveEvent.Type.INFO, function(e) {
            //   console.log("info: " + e.msg);
            // });

            l_oUnarchiver.addEventListener(bitjs.archive.UnarchiveEvent.Type.EXTRACT, function(e) {
                console.log("extract: " + e.unarchivedFile.filename);
                l_oSelf._addToPageCollection(i_sFilename, e.unarchivedFile.fileData);
            });

            this.set({
                'loadType': 'extract'
            });
            l_oUnarchiver.start();
        },

        //=======================================================================
        _updateProgress: function(i_oEvent) {
            var l_fLoadProgress = (i_oEvent.currentBytesUnarchived / i_oEvent.totalUncompressedBytesInArchive) * 100;
            // console.log( "ComicModel::_processArchiveData::updateProgressBar::Progress is ", l_fLoadProgress.toFixed( 2 ), "%" );
            this.set('loadProgress', l_fLoadProgress.toFixed(2));
        },

        //=======================================================================
        _complete: function(i_oEvent) {
            console.log("ComicModel::_complete::", this.comicPageCollection.length, " pages loaded ... ");
            this.set('loadComplete', true);
        },

        //=======================================================================
        _addToPageCollection: function(i_sFilename, i_oFileData) {
            var l_oBlob = new Blob([i_oFileData], {
                    'type': 'image/jpg'
                }), // type might be off
                l_oDataURL = URL.createObjectURL(l_oBlob);

            // keep blob ?
            this.comicPageCollection.add({
                index: this.comicPageCollection.length,
                imgURL: l_oDataURL,
                fileName: i_sFilename
            });
        },

        //=======================================================================
        assertCurrentIdx: function() {
            this._validateCurrentIdx(this.get("currentPageIdx"));
        },

        //=======================================================================
        _validateCurrentIdx: function(i_nCurIdx) {
            // call update current ?
            var l_nCurIdx = Number(i_nCurIdx),
                l_bDualLayout = this.get('dualLayout');

            if (l_bDualLayout && l_nCurIdx === this.comicPageCollection.length - 1) {
                l_nCurIdx--;
            }

            this.set('currentPageIdx', l_nCurIdx);
        },

        // when selecting comic from input
        //=======================================================================
        updateCurrentComicPage: function(i_oModel) {
            var l_nCurIdx = i_oModel.get('index'),
                l_bDualLayout = this.get('dualLayout'),
                l_oNextPageModel = null;

            this._validateCurrentIdx(l_nCurIdx);

            if (l_bDualLayout) {
                l_oNextPageModel = this.getNextPageModel();
            }

            this.notifyCurentComicChanged(l_nCurIdx, this.getCurrentPageModel(), l_oNextPageModel);
        },

        //=======================================================================
        prevPage: function() {
            var l_nCurIdx = this.get('currentPageIdx');

            if (l_nCurIdx > 0) {
                l_nCurIdx--;
                if (this.get('dualLayout') && l_nCurIdx > 0) {
                    l_nCurIdx--;
                }

                this.set('currentPageIdx', l_nCurIdx);
                this.notifyCurentComicChanged(l_nCurIdx, this.get('dualLayout'));
            }
        },

        //=======================================================================
        nextPage: function() {
            var l_bDualLayout = this.get('dualLayout'),
                l_nInc = l_bDualLayout ? 2 : 1,
                l_nDesiredIdx,
                l_nCurIdx = Number(this.get('currentPageIdx'));

            l_nDesiredIdx = l_nCurIdx + l_nInc;
            if (l_nDesiredIdx <= this.comicPageCollection.length - l_nInc) {
                l_nCurIdx = l_nDesiredIdx;
            } else if (l_nCurIdx + 1 < this.comicPageCollection.length - 1) {
                l_nCurIdx++;
            }

            this.set('currentPageIdx', l_nCurIdx);
            this.notifyCurentComicChanged(l_nCurIdx, l_bDualLayout);
        },

        //=======================================================================
        notifyCurentComicChanged: function(i_nIdx) {
            var l_oNextPageModel = null;
            if (this.get('dualLayout')) {
                l_oNextPageModel = this.getNextPageModel();
            }

            Backbone.Events.trigger("comic-page-updated", this.getCurrentPageModel(), this, l_oNextPageModel);
        }
    });
});
