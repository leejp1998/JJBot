const { Client, GatewayIntentBits, Events } = require("discord.js");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

let anniversaries = {}; // Object to store anniversaries temporarily
const DB_PATH = path.join(__dirname, "anniversaries.json");

// Load environment variables and check if token exists
const result = dotenv.config();
if (result.error) {
  console.error("Error loading .env file:", result.error);
  process.exit(1);
}

if (!process.env.TOKEN) {
  console.error("No token found in .env file!");
  process.exit(1);
}

console.log("Starting bot...");

// Initialize DB if it doesn't exist
if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify([]));
}

function loadAnniversaries() {
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveAnniversaries(anniversaries) {
  fs.writeFileSync(DB_PATH, JSON.stringify(anniversaries, null, 2));
}

// Function to calculate D-Day
function calculateDday(dateStr) {
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6)) - 1;
  const day = parseInt(dateStr.substring(6, 8));

  // Get today's date at midnight
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // First, try this year's anniversary
  let anniversaryDate = new Date(today.getFullYear(), month, day);

  // If this year's anniversary has passed or it's today, use next year's anniversary
  if (today >= anniversaryDate) {
    anniversaryDate = new Date(today.getFullYear() + 1, month, day);
  }

  // Calculate the difference in days
  const diffTime = anniversaryDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

function getAnniversariesWithDday(anniversaries) {
  return anniversaries.map((ann, originalIndex) => ({
    ...ann,
    originalIndex: originalIndex, // Store original 1-based index
    dday: calculateDday(ann.date),
  }));
}

function findAnniversaryByDate(anniversaries, dateStr) {
  return anniversaries.findIndex((ann) => ann.date === dateStr);
}

function isValidDate(dateStr) {
  // Check if the string is exactly 8 digits
  if (!/^\d{8}$/.test(dateStr)) return false;

  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6)) - 1;
  const day = parseInt(dateStr.substring(6, 8));

  // Check if year is reasonable (between 1900 and current year + 100)
  const currentYear = new Date().getFullYear();
  if (year < 1900 || year > currentYear + 100) return false;

  const date = new Date(year, month, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month &&
    date.getDate() === day
  );
}

function formatDate(dateStr) {
  // Format YYYYMMDD to YYYY-MM-DD for display
  return `${dateStr.substring(0, 4)}-${dateStr.substring(
    4,
    6
  )}-${dateStr.substring(6, 8)}`;
}

function calculateAnniversaryYear(dateStr) {
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6)) - 1;
  const day = parseInt(dateStr.substring(6, 8));
  const anniversaryDate = new Date(year, month, day);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let yearDiff = today.getFullYear() - anniversaryDate.getFullYear();

  // If this year's anniversary hasn't happened yet, subtract one year
  const thisYearAnniversary = new Date(today.getFullYear(), month, day);
  if (today < thisYearAnniversary) {
    yearDiff--;
  }

  return yearDiff;
}

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// When the client is ready, run this code (only once)
client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
  console.log("Bot is in these servers:");
  readyClient.guilds.cache.forEach((guild) => {
    console.log(` - ${guild.name}`);
  });
});

// Basic message handling
client.on(Events.MessageCreate, async (message) => {
  console.log(`Received message: ${message.content}`);

  // Ignore messages from bots
  if (message.author.bot) return;

  const args = message.content.split(" ");
  const command = args[0];

  if (command === "!anniversary") {
    console.log("기념일 커맨드 입력");
    const subCommand = args[1];

    if (!subCommand) {
      // Show all anniversaries
      const anniversaries = loadAnniversaries();
      if (anniversaries.length === 0) {
        return message.reply(
          "등록된 기념일이 없는걸? 최초의 기념일을 등록해봐! 기념일을 등록하려면 `!anniversary add YYYYMMDD` 로 할 수 있어!"
        );
      }

      // Get anniversaries with D-day calculations and sort them
      const sortedAnniversaries = getAnniversariesWithDday(anniversaries).sort(
        (a, b) => a.dday - b.dday
      );

      console.log(sortedAnniversaries);

      newIdx = 1;

      const response = sortedAnniversaries
        .map((ann) => {
          if (ann.title.includes("N")) {
            const yearDiff = calculateAnniversaryYear(ann.date) + 1;
            return `${newIdx++}. **${yearDiff}주년: D-${ann.dday}** (${
              ann.date
            })`;
          }
          return `${newIdx++}. **${ann.title}**: **D-${
            ann.dday
          }** (${formatDate(ann.date)})`;
        })
        .join("\n");

      return message.reply(response);
    }

    if (subCommand === "add") {
      const title = args[2];
      if (!title) {
        return message.reply("기념일 이름을 등록해줘! 예를들면 우리의 1일!?");
      }

      const dateStr = args.slice(3).join(" ");
      if (!dateStr || !isValidDate(dateStr)) {
        return message.reply("날짜 형식을 `YYYYMMDD`로 바꿔서 다시 해줘!");
      }

      const anniversaries = loadAnniversaries();
      anniversaries.push({ date: dateStr, title });
      saveAnniversaries(anniversaries);

      const dday = calculateDday(dateStr);
      return message.reply(
        `기념일이 등록됐어!! ${formatDate(
          dateStr
        )} 까지 남은 날은 ${dday}일이야야`
      );
    }

    if (subCommand === "edit") {
      const anniversaries = loadAnniversaries();
      if (args.length === 2) {
        // Show list for editing
        const list = getAnniversariesWithDday(anniversaries)
          .sort((a, b) => a.dday - b.dday)
          .map((ann) => `${ann.title} (${ann.date}): D-${ann.dday}`)
          .join("\n");
        return message.reply(
          `수정할 기념일의 인덱스와 새로운 날짜를 입력해줘.\n${list}`
        );
      }

      const dateStr = args[2];
      if (!isValidDate(dateStr)) {
        return message.reply("올바른 날짜 포맷(YYYYMMDD)로 입력해줘! 😡");
      }

      const index = findAnniversaryByDate(anniversaries, dateStr);
      if (index === -1) {
        return message.reply("첫 날짜가 존재하는 기념일인지 체크해볼래?");
      }

      const newTitle = args.slice(3).join(" ");
      if (!newTitle) {
        newTitle = anniversaries[index].title;
      }

      anniversaries[index].title = newTitle;
      saveAnniversaries(anniversaries);

      const dday = calculateDday(dateStr);
      return message.reply(
        `기념일이 업데이트 됐어어: ${newTitle} (${dateStr}): D-${dday}`
      );
    }

    if (subCommand === "remove") {
      const anniversaries = loadAnniversaries();
      if (args.length === 2) {
        // Show list for deletion
        const list = getAnniversariesWithDday(anniversaries)
          .sort((a, b) => a.dday - b.dday)
          .map((ann) => `${ann.title} (${ann.date}): D-${ann.dday}`)
          .join("\n");
        return message.reply(`삭제할 기념일의 날짜를 입력해줘줘:\n${list}`);
      }

      const dateStr = args[2];

      if (!isValidDate(dateStr)) {
        return message.reply("올바른 날짜 포맷(YYYYMMDD)로 입력해줘! 😡");
      }

      const idx = findAnniversaryByDate(anniversaries, dateStr);
      if (idx === -1) {
        return message.reply("그 날짜에 기념일이 없는걸?");
      }

      anniversaries.splice(idx, 1);
      saveAnniversaries(anniversaries);
      return message.reply("기념일이 삭제됐어 😃");
    }

    if (subCommand === "help") {
      message.reply(
        "**--------지원하는 커맨드--------**\n\n" +
          "기념일 보기: `!anniversary`\n" +
          "기념일 등록: `!anniversary add <YYYYMMDD>`\n" +
          "기념일 수정: `!anniversary edit <수정하려는YYYYMMDD> <새로운YYYYMMDD>`\n" +
          "기념일 삭제: `!anniversary remove <YYYYMMDD>`"
      );
    }
  }
});

// Add error handling
client.on("error", (error) => {
  console.error("Discord client error:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});

// Log in to Discord with your client's token
console.log("Attempting to log in...");
client
  .login(process.env.TOKEN)
  .then(() => console.log("Bot logged in successfully"))
  .catch((error) => {
    console.error("Failed to log in:", error);
    process.exit(1);
  });
