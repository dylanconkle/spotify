var unirest = require('unirest');
var express = require('express');
var events = require('events');

var app = express();
app.use(express.static('public'));

var getFromApi = function(endpoint, args) {
    var emitter = new events.EventEmitter();
    unirest.get('https://api.spotify.com/v1/' + endpoint)
        .qs(args)
        .end(function(response) {
            emitter.emit('end', response.body);
        });
    return emitter;
};

var getTracks = function(artist, cb) {
    unirest.get('https://api.spotify.com/v1/artists/' + artist.id + '/top-tracks?country=US')
        .end(function(response) {
            if (!response.error) {
                artist.tracks = response.body.tracks;

                cb();
            } else {
                cb(response.error);
            }
        });
};

app.get('/search/:name', function(req, res) {
    var searchReq = getFromApi('search', {
        q: req.params.name,
        limit: 1,
        type: 'artist'
    });

    searchReq.on('end', function(item) {
        var artist = item.artists.items[0];
        unirest.get('https://api.spotify.com/v1/artists/' + artist.id + '/related-artists')
            .end(function(response) {
                if (!response.error) {
                    artist.related = response.body.artists;


                    var totalArtists = artist.related.length;
                    var completed = 0;



                    var checkComplete = function() {
                        if (completed === totalArtists) {
                            res.json(artist);
                        }
                    };

                    artist.related.forEach(function(artist) {
                        getTracks(artist, function(err) {
                            if (err) {

                                res.sendStatus(404);
                            }

                            completed += 1;
                            checkComplete();

                        });
                    });

                } else {
                    res.sendStatus(404);
                }

            });

    });

    searchReq.on('error', function() {
        res.sendStatus(404);
    });

});

app.listen(process.env.PORT || 8080);
