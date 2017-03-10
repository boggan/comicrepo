require.config({
   paths: { 'jquery': '../libs/jquery/2.1.1/jquery-2.1.1.min',
            'underscore': '../libs/underscore/1.5.2/underscore',
            'backbone': '../libs/backbone/1.1.0/backbone',
            'tpl': '../libs/requirejs-tpl/tpl',
            'libs': '../libs',
            'templates': '../../templates'
         }
});

require(['apps/ComicReaderClient' ], function( ComicReaderClient ) {
   var l_oApp = new ComicReaderClient();
   l_oApp.run();
});