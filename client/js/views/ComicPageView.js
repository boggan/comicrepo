/*
TODO: make page dimensions adjustable
*/
define(['backbone', 'tpl!templates/comicPage.html'],
    function(Backbone, ComicPageTemplate) {
        return Backbone.View.extend({
            className: 'comic-fullpage-container',
            events: {
                'click canvas': 'comicPageClicked'
            },

            SampleWidth: 200,
            SampleHeight: 100,
            MagWidth: 400,
            MagHeight: 200,
            fitToWidth: false, // default

            //=======================================================================
            initialize: function(options) {
                this.m_bShowMagnifyingRect = false;
                this.m_bMagnifierEnabled = false;
                this.m_oCanvasCtx = null;
                this.listenTo(Backbone.Events, "comic-page-updated", this.updateModel, this);
                this.listenTo(Backbone.Events, "toggle-magnifier", this._toggleMagnifier, this);

                this.listenTo(Backbone.Events, "comic-fit-width", this._fitComicToWidth, this);
                this.listenTo(Backbone.Events, "comic-fit-height", this._fitComicToHeight, this);

                // for defaults
                if ($(window).height() < 800) {
                    this.fitToWidth = true;
                }

                if (options.nextPageModel) {
                    // dual view mode
                    this.model.set("pageLayout", "dual");
                    this.pageLayout = "dual";
                    this.nextPageModel = options.nextPageModel;
                } else {
                    this.model.set("pageLayout", "single");
                }
            },

            //=======================================================================
            _fitComicToWidth: function() {
                if (!this.fitToWidth) {
                    this.fitToWidth = true;
                    this.renderComic();
                }
            },

            //=======================================================================
            _fitComicToHeight: function() {
                if (this.fitToWidth) {
                    this.fitToWidth = false;
                    this.renderComic();
                }
            },

            // refactor using only single canvas ?
            // Pros: - easier magnifying glass code for dual display
            //       - could have better transition effects
            // Cons?: - only canvas would be on display, not image object
            //        - need to create backup of dual drawn canvas for magnifying code
            //          in order to redraw a single source and not a dual (perf loss, maybe?)
            //=======================================================================
            render: function() {
                // container dimensions
                this.$el.height($(window).height() - 160);
                this.$el.width($(window).width() - 150);

                // include images in container
                this.$el.html(ComicPageTemplate(this.model));
                this.renderComic();

                return this;
            },

            /*
             * container width / height -- always fit to screen ?
             * canvas width / height -- depending on dual layout or not
             */
            //======================================================================
            renderComic: function(i_fCanvasWidth, i_fCanvasHeight) {
                var l_oSelf = this,
                    l_nST = new Date().getTime(),
                    l_nET;

                // preload images + draw them
                this._loadPagesToDraw()
                    .then(function(i_aImages) {
                        // calculate total image dimensions here -- before rendering ???
                        l_oSelf._setupCanvas(i_aImages, i_fCanvasWidth, i_fCanvasHeight);
                        l_nET = new Date().getTime();
                        console.log("_fitComicToWidth::Execution Time: ", (l_nET - l_nST), "ms");
                    });
            },

            //======================================================================
            _loadPagesToDraw: function() {
                var l_oSelf = this,
                    l_aPromises = [];
                l_aPagesToDraw = [this.model];

                if (this.nextPageModel) {
                    l_aPagesToDraw.push(this.nextPageModel);
                }

                l_aPromises = l_aPagesToDraw.map(function(i_oPageModel) {
                    return new Promise(function(i_oResolve) {
                        var l_oImg = $('#page-' + i_oPageModel.cid)[0];
                        if (l_oImg.complete) {
                            i_oResolve(l_oImg);
                        } else {
                            l_oImg.onload = function() {
                                i_oResolve(l_oImg);
                            };
                        }
                    });
                });

                return Promise.all(l_aPromises);
            },

            //=======================================================================
            _calcImageDimensions: function(i_aImages) {
                var l_oImgStats = {
                    ratio: 1.0,
                    maxHeight: -1,
                    maxWidth: -1
                };

                // take tallest image
                i_aImages.forEach(function(i_oImg) {
                    l_oImgStats.maxWidth += i_oImg.naturalWidth;
                    l_oImgStats.maxHeight = Math.max(l_oImgStats.maxHeight, i_oImg.naturalHeight);
                });

                l_oImgStats.ratio = l_oImgStats.maxWidth / l_oImgStats.maxHeight;

                return l_oImgStats;
            },

            _registerCanvasEvents: function(i_oCanvas) {
                var l_oSelf = this;

                i_oCanvas.onmousemove = function(evt) {
                    if (l_oSelf.m_bMagnifierEnabled) {
                        l_oSelf._onCanvasMouseMove(evt);
                    }
                };

                i_oCanvas.onmousedown = function(e) {
                    if (l_oSelf.m_bMagnifierEnabled) {
                        l_oSelf._onCanvasMouseDown(e);
                    }
                };

                i_oCanvas.onmouseup = function(e) {
                    l_oSelf._onCanvasMouseUp(e);
                };
            },

            /*
             * Calculate Total image dimnensions (max width / max height)
             * Ratio = Width / height
             * if fit to width -> cap on width, calc height with ratio
             * if fit to height -> cap on height, calc width
             */

            //=======================================================================
            _setupCanvas: function(i_aImages) {
                var l_oSelf = this,
                    l_oCanvas,
                    l_oHiResCanvas = document.createElement("canvas"),
                    l_oOriginalCanvas = document.createElement("canvas"),
                    l_fHiResOffsetX = 0,
                    l_oImgStats;

                l_oCanvas = this.$('canvas')[0];
                this._registerCanvasEvents(l_oCanvas);

                l_oImgStats = l_oSelf._calcImageDimensions(i_aImages);

                if (this.fitToWidth) {
                    l_fCanvasWidth = this.$el.width();
                    l_fCanvasHeight = l_fCanvasWidth / l_oImgStats.ratio;
                } else {
                    l_fCanvasHeight = this.$el.height();
                    l_fCanvasWidth = l_fCanvasHeight * l_oImgStats.ratio;
                }

                l_oCanvas.width = l_fCanvasWidth;
                l_oCanvas.height = l_fCanvasHeight;

                l_oOriginalCanvas.width = l_oCanvas.width;
                l_oOriginalCanvas.height = l_oCanvas.height;

                l_oHiResCanvas.width = l_oImgStats.maxWidth;
                l_oHiResCanvas.height = l_oImgStats.maxHeight;


                // draw hi res image
                i_aImages.forEach(function(i_oImg) {
                    this._drawComic(i_oImg, i_oImg.naturalWidth, l_oHiResCanvas, l_fHiResOffsetX);
                    l_fHiResOffsetX += i_oImg.naturalWidth;
                }, this);

                // draw hi res image on canvas
                this._drawComic(l_oHiResCanvas, l_oCanvas.width, l_oCanvas, 0);
                // create a copy
                this._drawComic(l_oHiResCanvas, l_oCanvas.width, l_oOriginalCanvas, 0);

                this.m_oHiRezCanvas = l_oHiResCanvas;
                this.m_oOriginalCanvas = l_oOriginalCanvas;
            },

            //=======================================================================
            _drawComic: function(i_oImg, i_fImgWidth, i_oCanvas, i_fOffsetX) {
                var l_oSelf = this,
                    l_o2DCtx = i_oCanvas.getContext('2d'),
                    l_fImgRatio,
                    l_fNewHeight;

                l_fImgRatio = i_oImg.width / i_oImg.height;
                l_fNewHeight = i_fImgWidth / l_fImgRatio;

                l_o2DCtx.drawImage(i_oImg, i_fOffsetX, 0, i_fImgWidth, l_fNewHeight); // , l_oImg.width, l_oImg.height
            },

            //=======================================================================
            _toggleMagnifier: function(i_bEnabled) {
                this.m_bMagnifierEnabled = i_bEnabled;
                if (!i_bEnabled) {
                    this._onCanvasMouseUp(); // make sure to clear the magnifier
                }
            },

            //=======================================================================
            _onCanvasMouseDown: function(i_oEvent) {
                this.m_bShowMagnifyingRect = true;

                var l_oCanvas = this.$('canvas'),
                    l_oOffset = l_oCanvas.offset(),
                    l_fImgXPos = i_oEvent.clientX - l_oOffset.left, // i_oEvent.clientX, // - l_oCanvas.offsetLeft,
                    l_fImgYPos = (i_oEvent.clientY - l_oOffset.top) + window.document.body.scrollTop; //  + this.el.scrollTop; //

                console.log("mouse down on image : x: ", l_fImgXPos, " y: ", l_fImgYPos);
                this._drawMagnifiedRect(l_fImgXPos, l_fImgYPos);
            },

            //=======================================================================
            _onCanvasMouseUp: function(i_oEvent) {
                var l_oCanvas = this.$('canvas')[0],
                    l_o2DCtx = l_oCanvas.getContext('2d');

                console.log("- mouse up on image ");
                this.m_bShowMagnifyingRect = false;
                l_o2DCtx.drawImage(this.m_oOriginalCanvas, 0, 0, l_oCanvas.width, l_oCanvas.height); // , l_oImg.width, l_oImg.height
            },

            //=======================================================================
            _onCanvasMouseMove: function(i_oEvent) {
                var l_oCanvas = this.$('canvas')[0],
                    l_fImgXPos,
                    l_fImgYPos;

                console.log("* mouse move enabled: ", this.m_bShowMagnifyingRect);
                if (this.m_bShowMagnifyingRect) {
                    l_fImgXPos = i_oEvent.clientX - l_oCanvas.offsetLeft;
                    l_fImgYPos = (i_oEvent.clientY - l_oCanvas.offsetTop) + this.el.scrollTop + window.document.body.scrollTop;

                    console.log("* mouse move on image : x: ", l_fImgXPos, " y: ", l_fImgYPos);
                    this._drawMagnifiedRect(l_fImgXPos, l_fImgYPos);
                }
            },

            //=======================================================================
            _drawMagnifiedRect: function(i_nX, i_nY) {
                var l_oSelf = this,
                    l_oCanvas = this.$('canvas')[0],
                    l_o2DCtx = l_oCanvas.getContext('2d'),
                    l_oSource = this.m_oHiRezCanvas,
                    l_fScaledX = i_nX * (l_oSource.width / this.$('canvas').width()),
                    l_fScaledY = i_nY * (l_oSource.height / this.$('canvas').height()),
                    l_fNewHeight;

                // centering box
                l_fDX = i_nX;
                l_fDY = i_nY;

                l_fDX = i_nX - (this.MagWidth / 2);
                l_fDY = i_nY - (this.MagHeight / 2);

                // or clear prev rect ?!
                l_o2DCtx.drawImage(this.m_oOriginalCanvas, 0, 0, l_oCanvas.width, l_oCanvas.height); // , l_oImg.width, l_oImg.height

                // console.log("Drawing image subset from Source X/Y (", l_fScaledX, l_fScaledY,
                //     ") of dimensions ( ", this.SampleWidth, this.SampleHeight,
                //     "): To DST X/Y(", l_fDX, l_fDY,
                //     ") with dimensions: ", this.MagWidth, this.MagHeight);

                // need to project clicked x/y -> resized image x/y
                // create image subset using new canvas
                l_o2DCtx.drawImage(l_oSource,
                    l_fScaledX - (this.SampleWidth / 2), // sx
                    l_fScaledY - (this.SampleHeight / 2), // sy
                    this.SampleWidth, // sw
                    this.SampleHeight, // sh
                    l_fDX, // dx
                    l_fDY, // dy
                    this.MagWidth, // dw
                    this.MagHeight); // dh

                l_o2DCtx.beginPath();
                l_o2DCtx.rect(l_fDX, l_fDY, this.MagWidth, this.MagHeight);
                l_o2DCtx.lineWidth = 4;
                l_o2DCtx.strokeStyle = 'black';
                l_o2DCtx.stroke();
                l_o2DCtx.closePath();
            },

            //=======================================================================
            updateModel: function(i_oCurrentPageModel, i_oComicModel, i_oNextPageModel) {
                if (i_oCurrentPageModel !== this.model) {
                    this.model = i_oCurrentPageModel;
                    this.nextPageModel = i_oNextPageModel;
                    this.render();
                    this.$el.scrollTop(0); // scroll to top of page
                }
            },

            // if click on left edge (first 20% of witdh) call a prev command
            // if click on right edge (last 20% of width) call a next command
            //=======================================================================
            comicPageClicked: function(i_oEvent) {
                if (this.m_bMagnifierEnabled) {
                    return false;
                }

                var l_fImgWidth = this.$('canvas').width(),
                    l_fEdgeRatio = 0.10,
                    l_fLeftEdgeLimit = Math.round(l_fImgWidth * l_fEdgeRatio),
                    l_fRightEdgeStart = l_fImgWidth - Math.round(l_fImgWidth * l_fEdgeRatio),
                    l_fImgXPos = i_oEvent.clientX - this.$('canvas').offset().left;

                if (l_fImgXPos < l_fRightEdgeStart && l_fImgXPos < l_fLeftEdgeLimit)
                    Backbone.Events.trigger('prev-page');
                else if (l_fImgXPos >= l_fRightEdgeStart)
                    Backbone.Events.trigger('next-page');

                return false;
            }
        });
    });
