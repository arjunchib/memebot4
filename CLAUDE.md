# Project Overview and Development Guidelines

## Core Functionality

The memebot4 project is a complex, multimedia-focused bot/application designed to manage, process, and retrieve various types of media content (memes). It integrates with external services like S3/Cloudflare Storage and handles intensive backend tasks such as audio transcription.

## Key Components

- **Database:** Uses `bun:sqlite` for persistence, storing metadata about memes, commands, tags, and plays.
- **Media Services:** Handles audio processing, including fetching assets from cloud storage and transcribing them.

## Database

Use the `sqlite3` CLI tool for simple, ad-hoc queries:

1.  **Count all memes:** `sqlite3 memebot.sqlite "SELECT COUNT(*) FROM memes;";`
2.  **Find a specific meme by ID:** `sqlite3 memebot.sqlite "SELECT * FROM memes WHERE id = '<memeId>'";`

## Asset Retrieval

When referencing a meme's media file that is stored on the staging CDN, **always use the `ASSET_BASE_URL` defined in the `.env` file** to construct the full path. The correct URL structure for an asset with a given `memeId` should be:

`[ASSET_BASE_URL]/audio/[memeId].webm`

This ensures consistency when linking assets from the database ID to the physical files on the CDN.
