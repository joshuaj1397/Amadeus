const Discord = require('discord.js');
const Gracenote = require('node-gracenote');
const Gfycat = require('gfycat-sdk');
const fs = require('fs');
const ytdl = require('ytdl-core');
const readline = require('readline');
const {google} = require('googleapis');
const OAuth2 = google.auth.OAuth2;
const auth = require('./auth.json');
const Kurisu = require('./KurisuGifs.json');

var authGracenote = (graceApi) => {
    graceApi.register(function(err, res) {
        if (err) {
            console.log(err);
        } else {
            console.log('Connected to Gracenote');
            console.log('User Id: ' + res + '\n');
            gracenoteUserId = res;
        }
    });
};

var authGfycat = (gfycat) => {
    gfycat.authenticate((err, data) => {
    console.log('Connected to Gfycat: ', gfycat, '\n');
});
};

// Load client secrets from a local file.
fs.readFile('googleClientSecret.json', function processClientSecrets(err, content) {
  if (err) {
    console.log('Error loading client secret file: ' + err);
    return;
  }
  // Authorize a client with the loaded credentials
  authGoogle(JSON.parse(content));
});

var authGoogle = (credentials, callback) => {
    var clientSecret = credentials.installed.client_secret;
    var clientId = credentials.installed.client_id;
    var redirectUrl = credentials.installed.redirect_uris[0];
    var oauth2client = new OAuth2(clientId, clientSecret, redirectUrl);

    // Check if we already have a token
    fs.readFile('googleAuth.json', function (err, token) {
        if (err) {
            getNewGoogleToken(oauth2client, callback);
        } else {
            oauth2client.credentials = JSON.parse(token);
            callback(oauth2client);
        }
    });
}

var getNewGoogleToken = (oauth2Client, callback) => {
    var SCOPES = ['https://www.googleapis.com/auth/youtube.readonly'];
    var authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES
    });
    console.log('Authorize this app by visiting this url: ', authUrl);
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question('Enter the code from that page here: ', function(code) {
        rl.close();
        oauth2Client.getToken(code, function(err, token) {
            if (err) {
                console.log('Error while trying to retrieve access token', err);
                return;
            }
            oauth2Client.credentials = token;
            storeToken(token);
            callback(oauth2Client);
        });
    });
}

var storeToken = (token) => {
    fs.writeFile('googleAuth.json', JSON.stringify(token), (err) => {
        if (err) throw err;
  });
}

var bot = new Discord.Client({
    token: auth.discord.token,
    autorun: true
});
bot.login(auth.discord.token);

var gracenoteUserId = null;
var graceApi = new Gracenote(auth.gracenote.clientId, auth.gracenote.clientTag, gracenoteUserId);
authGracenote(graceApi);

var gfycat = new Gfycat({clientId: auth.gfycat.clientId, clientSecret: auth.gfycat.clientSecret});

// Listen for messages that start with '*'
var prefix = '*';

bot.on('ready', function(evt) {
    console.log('Connected to Discord');
    console.log('Logged in as: ');
    console.log(bot.user.username + ' - (' + bot.user.id + ')\n');
});

// Triggers when a new member is added to the server
bot.on('guildMemberAdd', member => {

    // TODO: Make the channel and welcome message configurable
    const channel = member.guild.channels.find('name', 'announcements');
    if (!channel) {
        console.log('Channel not found.');
        return;
    }
    channel.send(`Hi ${member}!`);
});

bot.on('message', message => {
    if (message.content.substring(0, 1) === prefix) {
        var args = message.content.substring(1).split(' ');
        var cmd = args[0];

        args = args.splice(1);
        switch (cmd) {

            // A test command
            case 'hello':
                message.channel.send('world!');
                break;

            // Make the bot say something
            case 'say':
            case 's':
                message.channel.send(message.content.substring(4));
                message.delete();
                break;

            // Leave a voice channel
            case 'leave':
            case 'l':
                leaveVoice(message);
                message.delete();
                break;

            // Join a voice channel
            case 'join':
            case 'j':
                joinVoice(message);
                message.delete();
                break;

            // Search a song on youtube in the form of {Artist} {Track}
            case 'search-youtube':
            case 's-yt':
                var artist = args[0];
                var track = args[1];
                searchYoutube(track, artist);
                break;

            // Play a song immediately regardless of queue position
            case 'play':
            case 'p':
                if (bot.voiceConnections.first()) {

                } else {
                    joinVoice(message);
                }

            // Search a gif then have the bot post it
            case 'gfycat':
                var query = message.content.substring(7);
                message.delete();
                break;

            default:
        }
    }
});

var searchGfy = (gfycat, query) => {
};

var leaveVoice = (message) => {
    if (bot.voiceConnections.first()) {
        bot.voiceConnections.first().disconnect();
    } else {

        // Let the gif play for 5 secs then delete it
        // TODO: Make the time to play the gif configurable
        message.reply('Baka! I\'m not in a voice channel! ' + Kurisu.angry)
        .then(sent => sent.delete(5 * 1000))
        .catch(console.log());
    }
};

var joinVoice = (message) => {
    if (!message.guild) return;
    if (bot.voiceConnections.first()) {
        message.reply('I\'m already in a voice channel!' + Kurisu.angry)
        .then(sent => sent.delete(5 * 1000))
        .catch(console.log());
        return;
    }

    if (message.member.voiceChannel) {
        message.member.voiceChannel.join()
            .then(connection => {
                var randNum = Math.floor(Math.random() * Kurisu.greeting.length)
                message.reply(Kurisu.greeting[randNum])
                .then(sent => sent.delete(5 * 1000))
                .catch(console.log());
            })
            .catch(console.log);
    } else {
        message.reply('You need to join a channel first! ' + Kurisu.angry)
        .then(sent => sent.delete(5 * 1000))
        .catch(console.log());
    }
};

var searchYoutube = (auth, artist, track) => {
    var service = google.youtube('v3');
    var query = artist + track;
    var parameters = {
        'params': {
            'auth': auth,
            'maxResults': '10',
            'part': 'snippet',
            'q': query,
            'type': 'video', // Videos only
            'topicId': '/m/04rlf' // Music only
            'videoDimension': '2d' // 2D videos only
        }
    }

    service.search.list(parameters, function(err, res) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }
        console.log(res);
    });
}
