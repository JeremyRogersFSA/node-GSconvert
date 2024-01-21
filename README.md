# Absence and Grade emailer

## What this app does

This app pulls data from a central data sheet that has all student information across the whole program.

After pulling that data, this app organizes it and creates a draft email. The email is crafted depending on number of absences and partials, and gives students quick and (hopefully) reliable data for them to check their own records.

## How to run

### structure your `.env` like this

```conf
CLIENT_ID=<yourid>.apps.googleusercontent.com
CLIENT_SECRET=<your_secret>
REDIRECT_URI=http://localhost
REFRESH_TOKEN=<your_refresh_token>
KEY=<your_API_Key>
CS_OFFSET=3
C_BLOCK=23
SHEET_NAME=grades
DAY_ONE=11-13-2023
DAY_TWO=11-17-2023
```

`CLIENT_ID` and `CLIENT_SECRET` are from your google app page, after registering a server side app.

`REDIRECT_URI` is registered and declared on the google app page as well. If you have a hosted app on Render or something you want to put that here, maybe. I haven't played with that.

`KEY` is your user key you registered with as a dev with google.

`CS_OFFSET` is used to calculate missing blocks in WS and CC. Blocks 9, 12, 23, 30, and 35 are CS, and need to be accounted for.

`C_BLOCK` is current DUE block, used in early exits and calculations for missing blocks.

`SHEET_NAME` is the google sheet name to target for the data scraping phase.

`DAY_ONE` and `DAY_TWO` are used to see if a student has been absent in the days listed here. Date format `mm-dd-yyyy` to align with other parts of the app, Google Sheets format, DateTime object, etc.

### Node or Bun

You can use either Node or Bun on this project currently. To use Bun, you'll need to install it:

`curl -fsSL https://bun.sh/install | bash`

or

`npm install -g bun`

There are other ways to install it, but likely you won't need to.

__**Caveat here: If you're on windows, it's experimental - suggested to install in WSL if you're on windows**__

Then, either `npm i` for NPM or `bun i` for Bun.

To run the project, pick your options:

- `npm run start`
- `bun run start:bun`
- `node createFromGS.js`
- `bun createFromGS.js`

## Have Fun Perusing

This is still a WIP. But have fun looking at how it works!

__Things to do:__

- Test if the fix for missingWS count works
-
