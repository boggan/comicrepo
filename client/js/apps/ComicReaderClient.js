define([ 'jquery', 'backbone', 'routers/ComicRouter' ], function( $, Backbone, ComicRouter ) {
   // return ComicReaderClientApp
   return function() {
      //=============================================================================
      // Public Members
      //=============================================================================

      //=============================================================================
      // Public methods
      //=============================================================================
      var m_oInterface = {};

      //=============================================================================
      m_oInterface.run = function() {
         // Start Backbone history a necessary step for bookmarkable URL's
         Backbone.history.start();
      };

      //=============================================================================
      // Private methods
      //=============================================================================
      function _list( i_sGroupId ) { // rename to "list"
         if( i_sGroupId ) {
            _listComicsByGroupId( i_sGroupId );
         }
         else {
            _listGroups();
         }
      }

      //=============================================================================
      function _listGroups() {
         m_oRouter.navigate( "list" );
         require( [ 'views/ComicGroupCollectionView' ], function( ComicGroupCollectionView ) {
            // remove previously instanciated ComicGroupCollectionView ?
            var l_oComicGroupListView = new ComicGroupCollectionView();
            l_oComicGroupListView.render();
            $( 'body' ).html( l_oComicGroupListView.$el );
         } );
      }

      //=============================================================================
      function _listComicsByGroupId( i_sGroupId ) {
         var l_aNavRoutes = [ "list" ];
         l_aNavRoutes.push( i_sGroupId );
         m_oRouter.navigate( l_aNavRoutes.join( '/' ) );

         require( [ 'views/ComicCollectionView' ], function( ComicCollectionView ) {
            if( m_oComicView ) {
               m_oComicView.remove(); // remove view from DOM + stop listening to events
               m_oComicView = null;
            }

            // remove previously instanciated ComicCollectionView ?
            var l_oComicListView = new ComicCollectionView( { groupId: i_sGroupId } );
            l_oComicListView.render();
            $( 'body' ).html( l_oComicListView.$el );
         } );
      }

      //=============================================================================
      function _listComics( i_oGroupModel ) {
         var l_aNavRoutes = [ "list" ];
         l_aNavRoutes.push( i_oGroupModel.get( '_id' ) );
         m_oRouter.navigate( l_aNavRoutes.join( '/' ) );

         require( [ 'views/ComicCollectionView' ], function( ComicCollectionView ) {
            if( m_oComicView ) {
               m_oComicView.remove(); // remove view from DOM + stop listening to events
               m_oComicView = null;
            }

            // remove previously instanciated ComicCollectionView ?
            var l_oComicListView = new ComicCollectionView({ groupId: i_oGroupModel.get( '_id' ) });
            l_oComicListView.render();
            $( 'body' ).html( l_oComicListView.$el );
         } );
      }

      //=============================================================================
      function _viewComicById( i_sGroupId, i_sComicId, i_nPageId ) {
         console.log( "ComicReaderClientApp::_viewComicById::Viewing comic by id : ", i_sComicId );
         require( [ 'models/ComicModel' ], function( ComicModel ) {
            var l_oComicModel = new ComicModel( {_id: i_sComicId, groupId: i_sGroupId, currentPageIdx: (i_nPageId || 0 ) } );
            // l_oComicModel.fetch();
            _updateComicNavRoute( l_oComicModel );
            // l_oComicModel.listenToOnce( l_oComicModel, 'change', function() {
               console.log( "ComicReaderClientApp::_viewComicById::Model has been fetched! ", l_oComicModel.toJSON() );
               _viewComic( l_oComicModel );
            // } );
         } );
      }

      //=============================================================================
      function _viewComic( i_oComicModel ) {
         _updateComicNavRoute( i_oComicModel );
         console.log( "ComicReaderClientApp::_viewComic::Viewing comic model : ", i_oComicModel.get( 'filename' ) );
         require( [ 'views/ComicView' ], function( ComicView ) {
            m_oComicView = new ComicView({model: i_oComicModel });
            m_oComicView.render();
            $( 'body' ).html( m_oComicView.$el );
         } );
      }

      //=============================================================================
      function _updateComicNavRoute( i_oComicModel ) {
         // update navigation route
         var l_aRouteComps = [ "comic", i_oComicModel.get( 'groupId' ), i_oComicModel.get( '_id' ) ],
             l_nPageId = i_oComicModel.get( 'currentPageIdx' );

         // i_oComicModel.get( '_id' ) || i_oComicModel.get( 'id' )
         if( l_nPageId )
            l_aRouteComps.push( l_nPageId );

         m_oRouter.navigate( l_aRouteComps.join( '/' ) );
      }

      //=============================================================================
      function _comicPageUpdated( i_nPageId, i_oComicModel ) {
         _updateComicNavRoute( i_oComicModel );
      }

      //=============================================================================
      function _registerRoutes() {
         m_oRouter = new ComicRouter();

         m_oRouter.on( 'route:notfound', function() {
            console.log( "route notfound" );
         } );

         m_oRouter.on( 'route:root', function() {
            console.log( "root route" );
            _list();
         } );

         m_oRouter.on( 'route:list', function( i_sGroupId ) {
            console.log( "\n\n\nlist route!\n\n\n" );
            _list( i_sGroupId );
         } );

         m_oRouter.on( 'route:comic', function( i_sGroupId, i_sComicId, i_nPageId ) {
            console.log( "comic route for group: ", i_sGroupId, " comic id: ", i_sComicId, " page: ", i_nPageId );
            _viewComicById( i_sGroupId, i_sComicId, i_nPageId );
         } );
      }

      //=============================================================================
      function _registerEvents() {
         Backbone.Events.on( 'view-list', _list );
         Backbone.Events.on( 'view-group', _listComics );
         Backbone.Events.on( 'view-comic', _viewComic );
         Backbone.Events.on( 'comic-page-updated', _comicPageUpdated );
      }

      //=============================================================================
      function __constructor__() {
         _registerRoutes();
         _registerEvents();
      }

      //=============================================================================
      // Private members
      //=============================================================================
      var m_oRouter = null,
          m_oComicView = null;

      // call constructor
      __constructor__();

      return m_oInterface;
   };
});
