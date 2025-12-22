# Manga Tracker V2
 A web-based platform designed to streamline manga tracking across various websites. Built with Cloudflare, React, and Puppeteer, it offers a fast, reliable, and modern experience for manga readers. Users can easily browse and view chapters, add new manga to their collection, and access detailed reading statistics — all from a centralized, intuitive interface. Behind the scenes, Puppeteer automates data collection, while Cloudflare ensures high availability and performance.

## How to Use

There are two supported options for using **MangaTracker**:

1. **Use the Hosted Version**  
   Visit [**manga.kdonohoue.com**](https://manga.kdonohoue.com) to start tracking and reading manga instantly — no setup required.

2. **Self-Host the App**  
   Prefer running it yourself? You can deploy the app on your own infrastructure.  
   Instructions for self-hosting are available below.

## Support / Help

Have a question, suggestion, or need a hand? Come hang out in our [**Discord Server**](https://discord.gg/WzuRuHzMGq)!

## Self Hosting Instructions

### Project Structure

The project is organized into several root folders, each handling a specific part of the system.  
Each folder includes its own `README.md` with setup instructions specific to that component.


- **`utils/`**  
  Contains various tools and scripts for tasks like viewing logs, migrating to new database versions, and other utility functions. **If you are updating and their are changes to the Database check this folder out!**

- **`puppeteerServer/`**  
  Responsible for collecting manga data from supported websites using Puppeteer. This is one of the required components for running the tracker.

- **`website/`**  
  Hosts both the Cloudflare server and the React-based web app. This is the main user interface and another required component for running the app.

- **`slashCommandBot/ (Currently Not Working)`**  
  A Discord bot that lets users interact with the tracker using slash commands. This component is optional.

> - **For the best experience**, it's recommended to use the **web app**.  
> - **Each folder has its own `README.md`** with setup instructions.  
> - **Required for core functionality**: `puppeteerServer/` and `website/`