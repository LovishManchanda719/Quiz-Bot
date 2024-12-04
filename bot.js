const { Client, GatewayIntentBits } = require('discord.js');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

// Discord Bot Token and API Key
const DISCORD_TOKEN = process.env.DISCORD_TOKEN; // Your Discord bot token
const GEMINI_API_KEY = process.env.API_KEY; // Gemini API key

// Setup Generative AI
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Initialize Discord Client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

// Global variables
const leaderboard = {}; // To maintain user scores
const askedQuestions = new Set(); // To track asked questions and avoid repetition

// Function to generate a random theme, country, and field
const getRandomAttributes = () => {
  const themes = ["Science", "History", "Technology", "Movies", "Sports"];
  const fields = ["General", "Physics", "Politics", "Entertainment", "Geography"];
  return {
    theme: themes[Math.floor(Math.random() * themes.length)],
    country: "India", // Default country
    field: fields[Math.floor(Math.random() * fields.length)],
  };
};

// Function to create a dynamic prompt
const generatePrompt = (theme, country, field) => `
Generate a trivia question about "${theme}" for "${country}" in the field of "${field}" in JSON format:
{
    "question": "string",
    "options": ["A) string", "B) string", "C) string", "D) string"],
    "correctAnswer": "string" // Use the letter only, e.g., "A"
}
Ensure the JSON is valid, well-formed, and avoid including any markdown or non-JSON content.
`;

// Function to fetch trivia question
async function fetchTrivia(prompt) {
  try {
    const result = await model.generateContent(prompt);

    if (result && result.response && typeof result.response.text === 'function') {
      let responseText = await result.response.text();

      // Remove markdown formatting (e.g., triple backticks)
      responseText = responseText.replace(/```json|```/g, '').trim();

      try {
        const trivia = JSON.parse(responseText);

        // Validate the structure of the JSON
        if (
          trivia.question &&
          Array.isArray(trivia.options) &&
          trivia.correctAnswer &&
          trivia.options.length === 4
        ) {
          const questionHash = `${trivia.question}:${trivia.correctAnswer}`;
          if (askedQuestions.has(questionHash)) {
            return null; // Skip already-asked questions
          } else {
            askedQuestions.add(questionHash);
            return trivia; // Return valid trivia
          }
        } else {
          throw new Error("Invalid JSON structure");
        }
      } catch (jsonError) {
        console.error("Error parsing JSON:", jsonError.message);
        return null; // Return null on error
      }
    } else {
      console.error("Unexpected response format:", result);
      return null; // Return null on error
    }
  } catch (error) {
    console.error("Error fetching trivia:", error.message);
    return null; // Return null on error
  }
}

// Command Handling
client.on('messageCreate', async (message) => {
  if (message.author.bot) return; // Ignore bot messages

  // Check for the trivia command
  if (message.content.startsWith('!trivia')) {
    const args = message.content.slice(7).trim().split(/\s+/); // Extract arguments after "!trivia"
    let theme = args[0] || "General";
    let country = args[1] || "General";
    let field = args[2] || "General";

    // Apply random attributes if both theme and field are "General"
    if (theme === "General" && field === "General") {
      const randomAttributes = getRandomAttributes();
      theme = randomAttributes.theme;
      field = randomAttributes.field;
    }

    const prompt = generatePrompt(theme, country, field);
    let trivia = await fetchTrivia(prompt);

    // Retry mechanism for duplicate or invalid trivia
    let retryCount = 0;
    while (!trivia && retryCount < 3) {
      trivia = await fetchTrivia(prompt);
      retryCount++;
    }

    if (trivia) {
      let triviaMessage = `**Trivia Time!**\n\n**${trivia.question}**\n`;
      trivia.options.forEach((option) => {
        triviaMessage += `${option}\n`;
      });
      triviaMessage += `\nReply with the letter of your answer (A, B, C, or D)!`;

      // Send the trivia question
      const triviaMsg = await message.channel.send(triviaMessage);

      // Collect responses
      const filter = (response) => {
        const answer = response.content.toUpperCase();
        return ["A", "B", "C", "D"].includes(answer) && response.author.id !== client.user.id;
      };

      const collector = message.channel.createMessageCollector({ filter, time: 15000 });
      let answered = false; // To ensure only the first correct user gets points

      collector.on('collect', (response) => {
        if (answered) return; // Ignore if someone already answered correctly

        const userAnswer = response.content.toUpperCase();
        if (userAnswer === trivia.correctAnswer) {
          answered = true;

          // Update leaderboard
          const userId = response.author.id;
          const username = response.author.username;
          leaderboard[userId] = (leaderboard[userId] || 0) + 1;

          response.reply(`🎉 Correct, ${username}! You earned 1 point. Your total score is now: ${leaderboard[userId]}`);
          collector.stop("answered");
        } else {
          response.reply("❌ Wrong answer. Keep trying!");
        }
      });

      collector.on('end', (collected, reason) => {
        if (reason !== "answered") {
          triviaMsg.edit(`${triviaMessage}\n\nTime's up! The correct answer was **${trivia.correctAnswer}**.`);
        }
      });
    } else {
      message.reply("Sorry, I couldn't generate a unique trivia question. Please try again later.");
    }
  }

  // Check for the leaderboard command
  if (message.content.startsWith('!leaderboard')) {
    if (Object.keys(leaderboard).length === 0) {
      return message.reply("No scores yet! Start playing by typing `!trivia`.");
    }

    let leaderboardMessage = "**Leaderboard**\n\n";
    Object.entries(leaderboard)
      .sort(([, a], [, b]) => b - a) // Sort by score descending
      .forEach(([userId, score], index) => {
        leaderboardMessage += `${index + 1}. <@${userId}> - ${score} point(s)\n`;
      });

    message.channel.send(leaderboardMessage);
  }
});

// Bot Login
client.login(DISCORD_TOKEN);
