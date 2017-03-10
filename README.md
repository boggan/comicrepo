# comicrepo
Web Application to catalog and read digitalized comics.

## Dependencies
- node js (https://nodejs.org/)
- bower (install via: npm -g install bower)
- mongodb (https://www.mongodb.com/)

## Installation

### Server

go to the **server** folder, and run the following commands:
- install dependencies via : npm install
- you can edit the config.js to fit with your environment if needed

### Client

nothing to do here, everything is ready to roll :)

### Comics
Place the comics you want to read in the **server/data/comics/** folder. Right now, the comics need to be grouped within a "collection" folder, ie: if you have Preacher comics (as example), you would place your Preacher comics in the **server/data/comics/Preacher/** folder.

## Launching

Once all the dependencies are installed and you have a mongodb service running on the local machine, and a few comics stored in the appropriate place, head over to the **server** folder and launch it via: node Server.js

once the server is running, head over to [http://localhost:3000/](http://localhost:3000/) with the browser of your choice (Chrome is recommended) and start your reading! :)

