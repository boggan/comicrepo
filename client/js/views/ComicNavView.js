define(['backbone', 'tpl!templates/comicNav.html'],
    function(Backbone, ComicNavTemplate) {
        return Backbone.View.extend({
            className: 'comic-nav',
            events: {
                'click .prev-page': 'prevPageClicked',
                'click .next-page': 'nextPageClicked',
                'click .magnify-tool': 'toggleMagnifier',
                'click .btn-single-page-view': 'singlePageClicked',
                'click .btn-dual-page-view': 'dualPageClicked',
                'click .btn-fit-height': 'fitToHeightClicked',
                'click .btn-fit-width': 'fitToWidthClicked',
                'change #magnify-indicator': 'indicatorChanged'
            },

            //=======================================================================
            initialize: function(options) {
                this.listenTo(Backbone.Events, 'toggle-magnifier', this.render, this);
            },

            //=======================================================================
            render: function() {
                this.$el.html(ComicNavTemplate(this.model));
                return this;
            },

            //=======================================================================
            prevPageClicked: function() {
                Backbone.Events.trigger('prev-page');
                return false;
            },

            //=======================================================================
            nextPageClicked: function() {
                Backbone.Events.trigger('next-page');
                return false;
            },

            //=======================================================================
            indicatorChanged: function() {
                var l_bChecked = this.$('#magnify-indicator')[0].checked;
                this.toggleMagnifier(null, l_bChecked);
            },

            //=======================================================================
            toggleMagnifier: function(i_oEvent, i_bChecked) {
                var l_bMagnified = i_bChecked === undefined ? !this.model.get('magnifyEnabled') : i_bChecked;
                this.model.set({
                    magnifyEnabled: l_bMagnified
                });
                Backbone.Events.trigger('toggle-magnifier', l_bMagnified);
                return false;
            },

            singlePageClicked: function() {
                Backbone.Events.trigger('comic-layout-single');
                return false;
            },

            dualPageClicked: function() {
                Backbone.Events.trigger('comic-layout-dual');
                return false;
            },

            fitToWidthClicked: function() {
                Backbone.Events.trigger('comic-fit-width');
                return false;
            },

            fitToHeightClicked: function() {
                Backbone.Events.trigger('comic-fit-height');
                return false;
            }
        });
    });
