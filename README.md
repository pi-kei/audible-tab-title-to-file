# audible-tab-title-to-file
Chrome extension that sends specified audible tab title to nodejs server that saves it to a file.
This file could be used to display current playing song in OBS.

## Installation and usage

### Requirements

- Google Chrome browser
- Node.js (To run server that receives a title and saves it to a file)
- OBS (To display text from a file)

### Config

Fill `config.json` at first.
By default, it supports audio from:

- vk.com
- music.yandex.ru
- youtube.com

### Add Chrome extension

- open `chrome://extensions`
- turn on `Developer mode`
- click `Load unpacked extension`
- navigate to a folder with `manifest.json`

### Run http-server

Run `server.js` with node.js. It listens to a 9999 port and saves data to a file located at home directory of your OS and named `song.txt`.

### Listen to a tab title changes

Open a tab in Chrome you want to listen to. Click on extension icon and click `Use on this page`.

### Create text in OBS

Config your text to load from a file.
