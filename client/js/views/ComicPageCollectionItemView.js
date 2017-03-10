define( ['backbone', 'tpl!templates/comicPageCollectionItem.html' ],
        function( Backbone, ComicPageCollectionItem ) {
   return Backbone.View.extend({
      tagName: "li",
      events: {
         'click': 'comicThumbnailClicked'
      },

      //=======================================================================
      initialize: function(options) {
      },

      //=======================================================================
      render: function() {
         this.el.setAttribute('id', this.model.cid);
         if( Number( this.model.collection.parent.get('currentPageIdx') ) === this.model.get( "index" ) )
            this.$el.addClass( "page-selected" );

         this.$el.html( ComicPageCollectionItem( this.model ));
         return this;
      },

      //=======================================================================
      comicThumbnailClicked: function() {
         console.log( "Comic Clicked: ", this.model.get( 'fileName' ) );
         Backbone.Events.trigger( 'comic-page-selected', this.model );
         this.$el.addClass( "page-selected" );
      }
   });
} );