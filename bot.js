const Discord = require('discord.js')
const Gracenote = require('node-gracenote')
const Gfycat = require('gfycat-sdk')
const fs = require('fs')
const ytdl = require('ytdl-core')
const readline = require('readline')
const {google} = require('googleapis')
const OAuth2 = google.auth.OAuth2
const auth = require('./auth.json')
const Kurisu = require('./KurisuGifs.json')

var authGracenote = (graceApi) => {
  graceApi.register(function (err, res) {
    if (err) {
      console.log(err)
    } else {
      console.log('Connected to Gracenote')
      console.log('User Id: ' + res + '\n')
      gracenoteUserId = res
    }
  })
}

var authGfycat = (gfycat) => {
  gfycat.authenticate((err, data) => {
    console.log('Connected to Gfycat: ', gfycat, '\n')
    if (err) {
      console.log('Error authenticating with Gfycat: ' + err)
    }
  })
}

var processGoogleSecrets = (callback, options) => {
  fs.readFile('googleClientSecret.json', function processClientSecrets (err, content) {
    if (err) {
      console.log('Error loading client secret file: ' + err)
      return
    }

    // Authorize a client with the loaded credentials, then call the YouTube API.
    authGoogle(JSON.parse(content), callback, options)
  })
}

var authGoogle = (credentials, callback, options) => {
  var clientSecret = credentials.web.client_secret
  var clientId = credentials.web.client_id
  var redirectUri = credentials.web.redirect_uris[0]
  var oauth2client = new OAuth2(clientId, clientSecret, redirectUri)

  // Check if we already have a token
  fs.readFile('googleAuth.json', function (err, token) {
    if (err) {
      getNewGoogleToken(oauth2client, callback)
    } else {
      oauth2client.credentials = JSON.parse(token)
      if (callback !== undefined) {
        callback(oauth2client, options)
      }
    }
  })
}

var getNewGoogleToken = (oauth2Client, callback, options) => {
  var SCOPES = ['https://www.googleapis.com/auth/youtube.readonly']
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  })
  console.log('Authorize this app by visiting this url: ', authUrl)
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  rl.question('Enter the code from that page here: ', async function (code) {
    rl.close()
    const {tokens} = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)
    storeToken(tokens)
    if (callback !== undefined) {
      callback(oauth2Client, options)
    }
  })
}

var storeToken = (token) => {
  console.log(token)
  fs.writeFile('googleAuth.json', JSON.stringify(token), (err) => {
    if (err) throw err
  })
}

var bot = new Discord.Client({
  token: auth.discord.token,
  autorun: true
})
bot.login(auth.discord.token)

var gracenoteUserId = null
var graceApi = new Gracenote(auth.gracenote.clientId, auth.gracenote.clientTag, gracenoteUserId)
authGracenote(graceApi)

var gfycat = new Gfycat({clientId: auth.gfycat.clientId, clientSecret: auth.gfycat.clientSecret})

// Listen for messages that start with '*'
var prefix = '*'

bot.on('ready', function (evt) {
  processGoogleSecrets()
  console.log('Connected to Discord')
  console.log('Logged in as: ')
  console.log(bot.user.username + ' - (' + bot.user.id + ')\n')
})

// Triggers when a new member is added to the server
bot.on('guildMemberAdd', member => {
  // TODO: Make the channel and welcome message configurable
  const channel = member.guild.channels.find('name', 'announcements')
  if (!channel) {
    console.log('Channel not found.')
    return
  }
  channel.send(`Hi ${member}!`)
})

bot.on('message', message => {
  if (message.content.substring(0, 1) === prefix) {
    var args = message.content.substring(1).split(' ')
    var cmd = args[0]

    args = args.splice(1)
    switch (cmd) {
      // A test command
      case 'hello':
        message.channel.send('world!')
        break

        // Make the bot say something
      case 'say':
      case 's':
        message.channel.send(message.content.substring(4))
        message.delete()
        break

        // Leave a voice channel
      case 'leave':
      case 'l':
        leaveVoice(message)
        message.delete()
        break

        // Join a voice channel
      case 'join':
      case 'j':
        joinVoice(message)
        message.delete()
        break

        // Search a song on youtube in the form of {Artist} - {Track}
      case 'search':

        // Produces {Artist}-{Track} then splits the artist and track using the '-'
        args = args.join('')
        args = args.split('-')
        var artist = args[0]
        var track = args[1]
        processGoogleSecrets(searchYoutube, {artist, track, message})
        break

      // Play a song immediately regardless of queue position
      case 'play':
      case 'p':
        if (bot.voiceConnections.first()) {

        } else {
          joinVoice(message)
        }
        break

      // Search a gif then have the bot post it
      case 'gfycat':
        var query = message.content.substring(7)
        message.delete()
        break

      default:
    }
  }
})

var searchGfy = (gfycat, query) => {
}

var leaveVoice = (message) => {
  if (bot.voiceConnections.first()) {
    bot.voiceConnections.first().disconnect()
  } else {
    // Let the gif play for 15 secs then delete it
    // TODO: Make the time to play the gif configurable
    message.reply('Baka! I\'m not in a voice channel! ' + Kurisu.angry)
      .then(sent => sent.delete(15 * 1000))
      .catch(console.log())
  }
}

var joinVoice = (message) => {
  if (!message.guild) return
  if (bot.voiceConnections.first()) {
    message.reply('I\'m already in a voice channel!' + Kurisu.angry)
      .then(sent => sent.delete(15 * 1000))
      .catch(console.log())
  } else if (message.member.voiceChannel) {
    message.member.voiceChannel.join()
      .then(connection => {
        var randNum = Math.floor(Math.random() * Kurisu.greeting.length)
        message.reply(Kurisu.greeting[randNum])
          .then(sent => sent.delete(15 * 1000))
          .catch(console.log())
      })
      .catch(console.log)
  } else {
    message.reply('You need to join a channel first! ' + Kurisu.angry)
      .then(sent => sent.delete(15 * 1000))
      .catch(console.log())
  }
}

var searchYoutube = async (gAuth, options) => {
  var service = google.youtube({
    version: 'v3',
    gAuth
  })
  var artist = options.artist
  var track = options.track
  var query = artist + ' ' + track

  await service.search.list({
    auth: gAuth,
    part: 'snippet',
    maxResults: '5',
    q: query,
    type: 'video', // Videos only
    topicId: '/m/04rlf', // Music only
    videoDimension: '2d' // 2D videos only
  }, function (err, res) {
    if (err) {
      console.log('The API returned an error: ' + err)
    } else {
      // TODO: Output this in a neat message
      var songs = []
      var i = 0
      for (let video of res.data.items) {
        var videoUrl = 'https://www.youtube.com/watch?v=' + video.id.videoId
        var title = video.snippet.title
        var choiceIndex = i+1
        songs[i] = {choiceIndex, title, videoUrl}
        i++
      }
      options.message.channel.send(buildSongList(songs))
    }
  })
}

/*
Song search view
```md
1. {Artist} - {Track}
---------------------------------------------------------------|
2. {Artist} - {Track}
---------------------------------------------------------------|
3. {Artist} - {Track}
---------------------------------------------------------------|
4. {Artist} - {Track}
---------------------------------------------------------------|
5. {Artist} - {Track}
---------------------------------------------------------------|
```
*/
var buildSongList = (songs) => {
  var messageSongList = '\`\`\`md\n'
  for (let song of songs) {
    console.log(song)
    var songChoice = song.choiceIndex + '. ' + song.title + '\n' +
      '---------------------------------------------------------------|\n'
      messageSongList = messageSongList.concat(songChoice)
  }
  messageSongList = messageSongList.concat('\`\`\`')
  return messageSongList
}

/*
Song queue view
```md
1. Gambino - 3005

2. Gambino - Sweatpants

3. * Gambino - 3005 *

4. Gambino - Sweatpants

5. Gambino - Sweatpants

```
*/
