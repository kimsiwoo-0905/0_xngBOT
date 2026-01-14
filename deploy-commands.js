require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId) {
  console.error("❌ .env에 DISCORD_TOKEN / CLIENT_ID가 필요해요.");
  process.exit(1);
}

// /도배
const spamCmd = new SlashCommandBuilder()
  .setName("도배")
  .setDescription("지정한 메시지를 지정한 횟수만큼 보냅니다")
  .addStringOption(o =>
    o.setName("메시지").setDescription("보낼 메시지").setRequired(true)
  )
  .addIntegerOption(o =>
    o.setName("개수").setDescription("보낼 횟수 (1~100)")
      .setRequired(true).setMinValue(1).setMaxValue(100)
  );

// /도배중지
const stopCmd = new SlashCommandBuilder()
  .setName("도배중지")
  .setDescription("진행 중인 도배를 중지합니다");

// ⭐ DM 가능하게 만드는 핵심 설정
const body = [
  {
    ...spamCmd.toJSON(),
    integration_types: [0, 1], // 서버 설치 + 유저 설치
    contexts: [0, 1, 2],       // 서버 / 봇DM / 개인DM
  },
  {
    ...stopCmd.toJSON(),
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
];

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    console.log("🌍 전역 슬래시 명령 등록 중...");
    await rest.put(
      Routes.applicationCommands(clientId),
      { body }
    );
    console.log("✅ 전역 슬래시 명령 등록 완료!");
    console.log("⚠️ DM 반영은 최대 1시간 걸릴 수 있어요.");
  } catch (e) {
    console.error("❌ 에러:", e);
  }
})();
