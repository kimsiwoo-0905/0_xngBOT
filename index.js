require("dotenv").config();
const { Client, GatewayIntentBits, Partials } = require("discord.js");

const token = process.env.DISCORD_TOKEN;
const allowed = new Set(
  (process.env.ALLOWED_USER_IDS || "")
    .split(",").map(s => s.trim()).filter(Boolean)
);

if (!token || allowed.size === 0) {
  console.error("❌ .env 설정 확인: DISCORD_TOKEN, ALLOWED_USER_IDS 필요");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages],
  partials: [Partials.Channel],
});

// 설정
const MAX_COUNT = 100;
const DELAY_MS = 250;
const COOLDOWN_MS = 2000;

const jobs = new Map();     // `${channelId}:${userId}` -> { cancelled }
const cooldown = new Map();

const sleep = ms => new Promise(r => setTimeout(r, ms));
const keyOf = (cid, uid) => `${cid}:${uid}`;

process.on("unhandledRejection", (err) => console.error("unhandledRejection:", err));
process.on("uncaughtException", (err) => console.error("uncaughtException:", err));

client.once("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (!interaction.isChatInputCommand()) return;

    // ✅ 들어오자마자 무조건 응답 예약(3초 제한 회피)
    // 이미 응답한 상태면 건너뜀
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: true });
    }

    // ✅ 허용 유저만
    if (!allowed.has(interaction.user.id)) {
      return interaction.editReply("❌ 허용된 사용자만 사용할 수 있어요.");
    }

    // /도배중지
    if (interaction.commandName === "도배중지") {
      const key = keyOf(interaction.channelId, interaction.user.id);
      const job = jobs.get(key);

      if (!job) return interaction.editReply("진행 중인 도배가 없어요.");
      job.cancelled = true;
      return interaction.editReply("🛑 도배 중지!");
    }

    // /도배
    if (interaction.commandName === "도배") {
      const now = Date.now();
      const last = cooldown.get(interaction.user.id) || 0;
      if (now - last < COOLDOWN_MS) {
        return interaction.editReply("⏳ 잠깐만 기다려줘!");
      }
      cooldown.set(interaction.user.id, now);

      const msg = interaction.options.getString("메시지", true);
      let count = interaction.options.getInteger("개수", true);
      count = Math.max(1, Math.min(MAX_COUNT, count));

      const key = keyOf(interaction.channelId, interaction.user.id);
      if (jobs.has(key)) {
        return interaction.editReply("이미 도배 중이야. `/도배중지` 사용!");
      }

      const job = { cancelled: false };
      jobs.set(key, job);

      await interaction.editReply(`🚀 도배 시작 (${count}회) — 중지: /도배중지`);

      for (let i = 0; i < count; i++) {
        if (job.cancelled) break;
        await interaction.channel.send(msg);
        await sleep(DELAY_MS);
      }

      jobs.delete(key);
      return;
    }

    // 혹시 다른 명령이 들어오면
    return interaction.editReply("알 수 없는 명령이에요.");
  } catch (e) {
    console.error("interaction handler error:", e);
    // 혹시라도 응답이 안 된 상태면 응답 시도
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: "❌ 오류가 발생했어.", ephemeral: true });
      } else {
        await interaction.editReply("❌ 오류가 발생했어.");
      }
    } catch {}
  }
});

client.login(token);
