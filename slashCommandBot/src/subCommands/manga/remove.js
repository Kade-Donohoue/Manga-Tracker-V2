const BaseSubcommandExecutor = require("../../utils/BaseSubCommandExecutor");
const config = require('../../../data/config.json')

module.exports = class mangaRemoveSubCommand extends BaseSubcommandExecutor {
    constructor(baseCommand, group) {
        super(baseCommand, group, 'remove')
    }

    async run(client, interaction) {
        const authID = interaction.user.id
        const mangaId = interaction.options.get('your_title').value

        await interaction.deferReply({ ephemeral: true })

        console.log(mangaId)
        const resp = await fetch(`${config.serverUrl}/api/data/remove/deleteUserManga`, {
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
        console.log(interaction.options.get('your_title'))
        if (resp.status==200) return await interaction.editReply({ content: `The Manga has been removed from your list!` })
        await interaction.editReply({ content: `An error ocurred while removing the manga` })
    }
}