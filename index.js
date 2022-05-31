 const SpotifyWebApi = require('spotify-web-api-node');
 const express = require('express');
 const cron = require('node-cron');
 require('dotenv').config();
 const fs = require('fs').promises;
 const path = require('path');

// function to encode file data to base64 encoded string
async function getImage(file) {
    const rootPath = path.resolve(__dirname);
    
    // read binary data
    var bitmap = await fs.readFile(rootPath + '/images/' + file);
    // convert binary data to base64 encoded string
    return Buffer.from(bitmap).toString('base64');
}
 
 const scopes = [
   'ugc-image-upload',
   'user-read-playback-state',
   'user-modify-playback-state',
   'user-read-currently-playing',
   'streaming',
   'app-remote-control',
   'user-read-email',
   'user-read-private',
   'playlist-read-collaborative',
   'playlist-modify-public',
   'playlist-read-private',
   'playlist-modify-private',
   'user-library-modify',
   'user-library-read',
   'user-top-read',
   'user-read-playback-position',
   'user-read-recently-played',
   'user-follow-read',
   'user-follow-modify'
 ];
 
 const spotifyApi = new SpotifyWebApi({
   redirectUri: process.env.REDIRECT_URI,
   clientId: process.env.CLIENT_ID,
   clientSecret: process.env.CLIENT_SECRET
 });
 
 const app = express();

 app.get('/', (req, res) => {
  console.log('200 was requested.')
  res.status(200).send('up and running');
 });
 
 app.get('/login', (req, res) => {
   res.redirect(spotifyApi.createAuthorizeURL(scopes));
 });
 
 app.get('/callback', (req, res) => {
   const error = req.query.error;
   const code = req.query.code;
   const state = req.query.state;
 
   if (error) {
     console.error('Callback Error:', error);
     res.send(`Callback Error: ${error}`);
     return;
   }
 
   spotifyApi
     .authorizationCodeGrant(code)
     .then(data => {
       const access_token = data.body['access_token'];
       const refresh_token = data.body['refresh_token'];
       const expires_in = data.body['expires_in'];
 
       spotifyApi.setAccessToken(access_token);
       spotifyApi.setRefreshToken(refresh_token);
 
       console.log('access_token:', access_token);
       console.log('refresh_token:', refresh_token);
 
       console.log(
         `Sucessfully retreived access token. Expires in ${expires_in} s.`
       );
       res.send('Success! You can now close the window.');
 
       setInterval(async () => {
         const data = await spotifyApi.refreshAccessToken();
         const access_token = data.body['access_token'];
 
         console.log('The access token has been refreshed!');
         console.log('access_token:', access_token);
         spotifyApi.setAccessToken(access_token);
       }, expires_in / 2 * 1000);
     })
     .then(() => {
       let countNumber = 1;
        cron.schedule(process.env.CRON_PERIOD, async () => {
          countNumber = await updatePlaylistName(countNumber);
        });
     })
     .catch(error => {
       console.error('Error getting Tokens:', error);
       res.send(`Error getting Tokens: ${error}`);
     });
 });
 
 app.listen(8080, () =>
   console.log(
     `HTTP Server up. On port ${8080}. Now go to in your browser.`
   )
 );

 async function updatePlaylistName(count) {
   console.log('Update Playlist Name.');
    
   await spotifyApi.changePlaylistDetails(process.env.PLAYLIST_ID,
    {
      name: ((count % 2) === 0) ? 'Start' : 'Finish',
    })

    console.log('new name', ((count % 2) === 0) ? 'Start' : 'Finish')

    let imageBaseFormat = await getImage(((count % 2) === 0) ? 'start.jpg' : 'finish.jpg')
    await spotifyApi.uploadCustomPlaylistCoverImage(process.env.PLAYLIST_ID, imageBaseFormat);
    console.log('new image', ((count % 2) === 0) ? 'start.jpg' : 'finish.jpg')
    count++;
    return count;
 }
