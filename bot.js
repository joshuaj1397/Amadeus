var Discord = require('discord.js');
var auth = require('./auth.json');

var bot = new Discord.Client({
    token: auth.token,
    autorun: true
});

bot.login(auth.token);

// Listen for messages that start with '*'
var prefix = '*';

bot.on('ready', function(evt) {
    console.log('Connected');
    console.log('Logged in as: ');
    console.log(bot.user.username + ' - (' + bot.user.id + ')');
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
                break;

            // Make the bot say something then delete the original message
            case 'sayd':
                message.channel.send(message.content.substring(5));
                message.delete();
                break;
            default:
        }
    }
});