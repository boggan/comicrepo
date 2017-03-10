define( ['backbone', '../models/ComicModel' ], function( Backbone, ComicModel ) {
   return Backbone.Collection.extend({
      model: ComicModel,
      url: "/API/list",

      //=======================================================================
      initialize: function(models, options) {
         this.url = [ this.url, options.groupId ].join( '/' );
      },

      //=======================================================================
      comparator: function(i_oModelA, i_oModelB) {
         return i_oModelA.get( "issue" ) < i_oModelB.get( "issue" ) ? -1 : 1;
      }
   });
} );