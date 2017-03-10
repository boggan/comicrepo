define(function(require) {
    var Backbone = require('backbone'),
        ComicPageCollectionItemView = require('views/ComicPageCollectionItemView'),
        ComicPageCollectionTemplate = require('tpl!templates/comicPageCollection.html');

    return Backbone.View.extend({
        id: "page-collection-container",

        //=======================================================================
        initialize: function(options) {
            // this.collection.fetch();
            // this.listenTo( this.collection, "reset", this.renderAll );
            this.listenTo(this.model, "change:currentPageIdx", this._updateComicPageSelection, this);
            this.listenTo(this.collection, "add", this.renderOne, this);
        },

        //=======================================================================
        render: function() {
            this.$el.height($(window).height() - 160);
            this.$el.html(ComicPageCollectionTemplate());
            this.renderAll();
            return this;
        },

        //=======================================================================
        renderAll: function() {
            this.collection.each(this.renderOne, this);
        },

        //=======================================================================
        renderOne: function(i_oModel) {
            var l_oComicPageCollectionItemView = new ComicPageCollectionItemView({
                model: i_oModel
            });
            this.$('#pages-list').append(l_oComicPageCollectionItemView.render().el);
        },

        //=======================================================================
        _updateComicPageSelection: function(i_oModel) {
            var l_oPageModel = this.model.getCurrentPageModel(),
                l_oPageView = this.$(['#', l_oPageModel.cid].join(''));
            this.$('.page-selected').removeClass('page-selected');
            l_oPageView.addClass('page-selected');

            if (l_oPageView[0].scrollIntoViewIfNeeded)
                l_oPageView[0].scrollIntoViewIfNeeded(); // experimental
            else
                this.$el.scroll(l_oPageView.offset().top);
        }
    });
});
