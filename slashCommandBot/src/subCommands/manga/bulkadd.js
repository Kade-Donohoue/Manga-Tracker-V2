const BaseSubcommandExecutor = require("../../utils/BaseSubCommandExecutor")
const {hyperlink, hideLinkEmbed} = require('discord.js')
const config = require('../../../data/config.json')

module.exports = class mangaBulkAddSubCommand extends BaseSubcommandExecutor {
    constructor(baseCommand, group) {
        super(baseCommand, group, 'bulkadd')
    }

    async run(client, interaction) {
        const authID = interaction.user.id
        const URLS = interaction.options.get('manga_url').value.split(",")
        const userCat = interaction.options.getString('category') ?? 'unsorted'
        await interaction.reply({ content : 'This will take a minute please wait...', ephemeral: true  })

        const resp = await fetch(`${config.serverUrl}/api/data/add/addManga`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                "access_token": config.serverPassword,
                "authId": authID,
                "userCat": userCat,
                "urls": URLS
            })
        })

        if (!resp.ok) return interaction.editReply('Internal Server Error Ocurred!')

        let respData = await resp.json()

        for (let manga of respData.results) {
            if (!manga.success) interaction.followUp({content: `${manga.message}: \n${hideLinkEmbed(manga.url)}`, ephemeral: true})
        }

        interaction.editReply("Done!")
  
    }
}