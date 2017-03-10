define( ['backbone' , '../models/ComicGroupModel' ], function( Backbone, ComicGroupModel ) {
   return Backbone.Collection.extend({
      model: ComicGroupModel,
      url: "/API/list",

      //=======================================================================
      initialize: function(options) {
      }
   });
} );