module.exports = {
  command: ["ping"],
  run: async (sock, m) => {
    await sock.sendMessage(m.key.remoteJid, { text: "pong activo ✅" })
  }
}