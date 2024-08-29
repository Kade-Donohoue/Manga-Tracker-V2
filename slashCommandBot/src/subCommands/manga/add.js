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
                "access_token": config.serverPassword,
                "authId": authID,
                "userCat": userCat,
                "urls": [URL]
            })
        })

        if (!resp.ok) return interaction.editReply({content: "Internal Server Error!"})

        // let responseData = await resp.json()
        console.log(responseData)
        if (!responseData.results[0].success) return interaction.editReply({content: responseData.results[0].message})
        return interaction.editReply({content: "Successfully added!"})
        
    }
}