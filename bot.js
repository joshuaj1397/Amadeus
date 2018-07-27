const Discord = require('discord.js');
const Gracenote = require('node-gracenote');
const Gfycat = require('gfycat-sdk');
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

var bot = new Discord.Client({
    token: auth.discord.token,
    autorun: true
});

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
        message.reply('Baka! I\'m not in a voice channel! ' + Kurisu.angry)
        .then(sent => sent.delete(5 * 1000))
        .catch(console.log());
    }
};

var joinVoice = (message) => {
    if (!message.guild) return;

    if (message.member.voiceChannel) {
        message.member.voiceChannel.join()
            .then(connection => {

                // Let the gif play for 5 secs then delete it
                // TODO: Make the time to play the gif configurable
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

bot.login(auth.discord.token);
