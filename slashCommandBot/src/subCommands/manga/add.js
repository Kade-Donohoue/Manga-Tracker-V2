const BaseSubcommandExecutor = require("../../utils/BaseSubCommandExecutor")
const config = require('../../../data/config.json')

module.exports = class mangaAddSubCommand extends BaseSubcommandExecutor {
    constructor(baseCommand, group) {
        super(baseCommand, group, 'add')
    }

    async run(client, interaction) {
        const authID = interaction.user.id
        const URL = interaction.options.get('manga_url').value
        const userCat = interaction.options.getString('category') ?? 'unsorted'
        await interaction.deferReply({ephemeral: true})
        const resp = await fetch(`${config.serverUrl}/api/data/add/addManga`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                "access_token": "null",
                "authId": authID,
                "userCat": userCat,
                "url": URL
            })
        })

        if (resp.status == 200) return interaction.editReply({content: "Successfully added!"})

        interaction.editReply({content: "Invalid URL"})
    }
}