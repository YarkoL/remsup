
Beginning of a remote support hub. Preserved mainly for historical/nostalgic purposes. 

Frontend is "vanilla" React. (The final product used Redux for state management).

Backend is accessed via socket. You need to implement api, the old uri is defunct.

Uses WebRTC and can communicate with the Unity plugin


How to install and run on Windows.
--------------------------------
by Jarkko 09-21-17

1. Unless you have it already, get Node from

	https://nodejs.org/en/download/

2. Open commandline and cd into remsup-portal

3. Install by issuing

	npm install

4. Start webserver

	node server.js

5. To view the site, open a browser window and go to

	http://localhost:3000


That's it, to run the tests, use command

	npm test

