define(function(require) {
    var Backbone = require('backbone'),
        ComicLoadView = require('views/ComicLoadView'),
        ComicPageCollectionView = require('views/ComicPageCollectionView'),
        ComicPageView = require('views/ComicPageView'),
        ComicNavView = require('views/ComicNavView'),
        ComicTemplate = require('tpl!templates/comic.html');

    return Backbone.View.extend({
        events: {
            'click .back-lnk': 'backClicked'
        },

        dualLayout: false,

        //=======================================================================
        initialize: function(options) {
            this.comicLoadView = new ComicLoadView({
                model: this.model
            });
            this.listenTo(this.model, 'change:loadComplete', this._checkProgress, this);
            this.listenTo(Backbone.Events, "comic-page-selected", this._updateCurrentComicPage, this);
            this.listenTo(Backbone.Events, "prev-page", this._prevPage, this);
            this.listenTo(Backbone.Events, "next-page", this._nextPage, this);

            this.listenTo(Backbone.Events, "comic-layout-single", this._layoutSingleView, this);
            this.listenTo(Backbone.Events, "comic-layout-dual", this._layoutDualView, this);

            var l_oSelf = this;
            window.addEventListener("keydown", function(i_oEvent) {
                if (i_oEvent.keyCode === 77 || i_oEvent.keyCode === 109) {
                    l_oSelf.model.set({
                        magnifyEnabled: true
                    });
                    Backbone.Events.trigger('toggle-magnifier', true);
                }
            });

            window.addEventListener("keyup", function(i_oEvent) {
                l_oSelf.model.set({
                    magnifyEnabled: false
                });
                Backbone.Events.trigger('toggle-magnifier', false);
            });

            // rename this function so load comic ?
            this.model.loadComic();
        },

        //=======================================================================
        render: function() {
            this.$el.html(ComicTemplate(this.model));
            this.$('#comic-load-container').append(this.comicLoadView.render().el);
        },

        //=======================================================================
        renderPageCollection: function() {
            var l_oComicPageCollectionView = new ComicPageCollectionView({
                    collection: this.model.comicPageCollection,
                    model: this.model
                }),
                l_oComicPageView,
                l_oComicPageViewOptions = {
                    model: this.model.getCurrentPageModel()
                },
                l_oTopComicNavView = new ComicNavView({
                    model: this.model
                }),
                l_oBottomComicNavView = new ComicNavView({
                    model: this.model
                });

            if (this.dualLayout) {
                l_oComicPageViewOptions.nextPageModel = this.model.getNextPageModel();
            }

            l_oComicPageView = new ComicPageView(l_oComicPageViewOptions);

            this.$('#comic-load-container').hide();

            this.$('#top-navbar-container').html(l_oTopComicNavView.render().el);
            this.$('#comic-page-collection').html(l_oComicPageCollectionView.render().el);
            this.$('#comic-page-collection').height(l_oComicPageCollectionView.render().$el.height());
            this.$('#comic-page-container').html(l_oComicPageView.render().el); // <- put this into container ?
            this.$('#bottom-navbar-container').html(l_oBottomComicNavView.render().el);
            this.m_oComicPageView = l_oComicPageView;

            // this.$('#comic-container').append(l_oTopComicNavView.render().el);
            // this.$('#comic-container').append(l_oComicPageCollectionView.render().el);
            // this.$('#comic-container').append(l_oComicPageView.render().el); // <- put this into container ?
            // this.$('#comic-container').append(l_oBottomComicNavView.render().el);
        },

        //=======================================================================
        _checkProgress: function() {
            if (this.model.get('loadProgress') >= 100 && this.model.get('loadComplete')) {
                console.log("LOAD COMPLETE");
                this.renderPageCollection();
            }
        },


        //=======================================================================
        _layoutSingleView: function() {
            console.log("Single view layout clicked");
            if (this.dualLayout) {
                this.dualLayout = false;
                this.model.set("dualLayout", this.dualLayout);

                delete this.m_oComicPageView.nextPageModel;
                this.m_oComicPageView.render();
            }
        },

        //=======================================================================
        _layoutDualView: function() {
            console.log("Dual view layout clicked");
            if (!this.dualLayout) {
                this.dualLayout = true;
                this.model.set("dualLayout", this.dualLayout);

                this.m_oComicPageView.nextPageModel = this.model.getNextPageModel();
                this.m_oComicPageView.render();
            }
        },

        //=======================================================================
        _updateCurrentComicPage: function(i_oComicPageModel) {
            this.model.updateCurrentComicPage(i_oComicPageModel);
        },

        //=======================================================================
        _prevPage: function() {
            this.model.prevPage(this.dualLayout);
        },

        //=======================================================================
        _nextPage: function() {
            this.model.nextPage(this.dualLayout);
        },

        //=======================================================================
        backClicked: function() {
            console.log("Back link clicked....");
            Backbone.Events.trigger('view-list', this.model.get("groupId"));
            return false;
        }
    });
});
