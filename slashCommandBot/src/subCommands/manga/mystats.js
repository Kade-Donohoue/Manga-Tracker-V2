const { AttachmentBuilder } = require("discord.js");
const BaseSubcommandExecutor = require("../../utils/BaseSubCommandExecutor")
const { generateUserStatCard }  = require('../../../src/utils/cardGenerator')
const config = require('../../../data/config.json')


module.exports = class mangaMyStatSubCommand extends BaseSubcommandExecutor {
    constructor(baseCommand, group) {
        super(baseCommand, group, 'mystats')
    }

    async run(client, interaction) {
        await interaction.deferReply({ ephemeral: true })

        const resp = await fetch(`${config.serverUrl}/api/data/pull/userStats`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                "access_token": "null",
                "authId": interaction.user.id
            })
        })
        if (resp.status!=200) return interaction.editReply({content: "Unable to fetch data"})

        const data = await resp.json()
        console.log(data)

        const currentTime = new Date().toLocaleDateString("en-US", {year: "numeric", month: "numeric", day: "numeric", timeZone: "America/Los_Angeles", timeZoneName: "short", hour: "numeric", minute: "numeric", hour12: true })

        const statCard = await generateUserStatCard(interaction.user.globalName, `${data.userStats.readManga} Manga`, `${data.userStats.chaptersRead} Chapters`, `${data.userStats.unreadManga} Manga`, `${data.userStats.chaptersUnread} Chapters`, currentTime)

        const attach = new AttachmentBuilder(statCard, { name: `${interaction.user.username}-card.png`})
        interaction.editReply({ files: [attach]})
    }
}