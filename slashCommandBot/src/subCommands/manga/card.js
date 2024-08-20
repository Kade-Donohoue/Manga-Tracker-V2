const { AttachmentBuilder } = require("discord.js");
const BaseSubcommandExecutor = require("../../utils/BaseSubCommandExecutor");
const { generateCard }  = require('../../../src/utils/cardGenerator')
const dataUtils = require('../../../src/utils/dataUtils')
const config = require('../../../data/config.json')

module.exports = class mangaCardSubCommand extends BaseSubcommandExecutor {
    constructor(baseCommand, group) {
        super(baseCommand, group, 'card')
    }

    async run(client, interaction) {
        const authID = interaction.user.id
        const mangaId = interaction.options.get('your_title').value

        await interaction.deferReply({ ephemeral: true })

        const resp = await fetch(`${config.serverUrl}/api/data/pull/getManga`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                "access_token": config.serverPassword,
                "authId": authID,
                "mangaId": mangaId
            })
        })
        if (resp.status!=200) return await interaction.editReply({ content: "Internal communicator error occurred. Please contact the bot owner or try again!" })
        const data = await resp.json()
        const chapTextList = data.mangaData.chapterTextList.split(',')
        const card = await generateCard(data.mangaData.mangaName, chapTextList.at(-1), chapTextList[parseInt(data.userInfo.currentIndex)], chapTextList[parseInt(data.userInfo.currentIndex)+1], `${chapTextList.length} Chapters`, data.mangaData.updateTime, data.mangaData.mangaId)
        if (!card) return interaction.editReply({content:"A internal system error has occurred"})
        const attach = new AttachmentBuilder(card, { name: `${data.mangaData.mangaId}-card.png`})
        interaction.editReply({ content: "", files: [attach], ephemeral: true})
    }
}