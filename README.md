# STUPID TO DO LIST

This is a really really stupid to do list web app that shouldn't exist.
![stupid.png](stupid.png)

[Watch it, stupid](https://www.youtube.com/watch?v=mzJVpDaHGUg)

## Features
- Only the maintainer knows how to use it - watch the video. Like, thumbs up and subscribe.
- It's so stupid that the database is a text file.
- It only runs on your computer machine and you have to be a developer to know how to run it

## Prerequisites

- Node.js (v14 or newer recommended)
- npm (comes with Node.js)

## Project Setup

1. Clone or download this repository to your local machine
2. Navigate to the project directory in your terminal
3. Run `npm install` to install dependencies
4. Run `npm run dev` to start the development server
5. Open your browser and navigate to `http://localhost:5173`

## Custom Todo Files Directory

You can configure a custom directory for todo files by setting the `TODO_CUSTOM_DIR` environment variable:

1. Copy the `.env.example` file to `.env`
2. Edit the `.env` file and set `TODO_CUSTOM_DIR` to the path of your custom todo files directory
3. Restart the server

Todo files in the custom directory will be displayed with a "Custom" badge in the file tabs.
