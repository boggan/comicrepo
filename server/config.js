var config = {};

//###### DO NOT EDIT ABOVE THIS LINE ######
//###### BEGIN: EDIT SECTION HERE ######
config.data = {
    paths: {
        comics: "data/comics",
        unpacked_comics: "data/unpacked",
        thumbnails: "data/thumbnails"
    },
    listing_max_file_size: 83886080, // 80MB
    unpacked: {
        lifetime: 1800000, // 30 minutes in MS
        watchdogInterval: 5 * 60 * 1000 // 5 minutes in MS
    }
};

config.network = {
    server_port: 3000,
    mongodb_server: "mongodb://localhost/comic_repo"
};

config.client_web_path = "../client";
config.admin_web_path = "../admin";
//###### END: EDIT SECTION HERE ######
//###### DO NOT EDIT BELOW THIS LINE ######
module.exports = config;
