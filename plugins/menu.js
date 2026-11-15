module.exports = {
  command: ["menu", "help"],
  run: async (sock, m, args, { settings }) => {
    const text = `╭─── ${settings.botName} ───
│ !ping - probar bot
│ !menu - este menú
╰───────────────`
    await sock.sendMessage(m.key.remoteJid, { text })
  }
}