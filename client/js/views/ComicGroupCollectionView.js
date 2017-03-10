define( ['backbone', '../collections/ComicGroupCollection', 'views/ComicGroupCollectionItemView', 'tpl!templates/comicGroupCollection.html' ],
        function( Backbone, ComicGroupCollection, ComicGroupCollectionItemView, ComicGroupCollectionTemplate ) {
   return Backbone.View.extend({
      //=======================================================================
      initialize: function(options) {

         if( !options || !options.collection )
            this.collection = new ComicGroupCollection();

         this.collection.fetch();

         this.listenTo( this.collection, "reset", this.renderAll );
         this.listenTo( this.collection, "add", this.renderOne );
      },

      //=======================================================================
      render: function() {
         this.$el.html( ComicGroupCollectionTemplate() );
         this.renderAll();
      },

      //=======================================================================
      renderAll: function() {
         this.collection.each( this.renderOne );
      },

      //=======================================================================
      renderOne: function( i_oModel ) {
         var l_oComicGroupCollectionItem = new ComicGroupCollectionItemView({ model: i_oModel });
         this.$('#group-container').append( l_oComicGroupCollectionItem.render().el );
      }
   });
} );