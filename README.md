# Discord Trivia Bot
A Discord bot for competitive trivia games! Answer AI-generated questions on various topics, track your score, and climb the leaderboard.

# Features
Dynamic Trivia: AI-generated questions on themes, countries, and fields.
Leaderboard: Tracks scores of participants.
Random Questions: No repeats during a session.
Customizable: Defaults to Indian trivia if no country is specified.
# Commands
!trivia [theme] [country] [field]: Starts a trivia game.
Example: !trivia Science India Technology
!leaderboard: Displays the top players.
# Setup
Clone the repository:

bash
Copy code
git clone https://github.com/yourusername/discord-trivia-bot.git
cd discord-trivia-bot
Install dependencies:

bash
Copy code
npm install
Create a .env file with:

env
Copy code
DISCORD_TOKEN=your_discord_bot_token
API_KEY=your_gemini_api_key
Run the bot:

bash
Copy code
node src/bot.js
# Structure
src/bot.js: Main bot logic.
src/commands.js: Handles commands.
src/triviaGenerator.js: Generates trivia questions.
#Contributing
Fork the repo, create a branch, commit your changes, and submit a pull request!

