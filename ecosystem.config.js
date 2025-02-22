module.exports = {
  apps: [
    {
      name: "discord-bot",
      script: "index.js",
      watch: true,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
