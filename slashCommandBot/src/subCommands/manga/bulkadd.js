const BaseSubcommandExecutor = require("../../utils/BaseSubCommandExecutor")
const {hyperlink, hideLinkEmbed} = require('discord.js')

module.exports = class mangaBulkAddSubCommand extends BaseSubcommandExecutor {
    constructor(baseCommand, group) {
        super(baseCommand, group, 'bulkadd')
    }

    async run(client, interaction) {
        const authID = interaction.user.id
        const URLS = interaction.options.get('manga_url').value.split(",")
        const userCat = interaction.options.getString('category') ?? 'unsorted'
        await interaction.reply({ content : 'This will take a minute please wait...', ephemeral: true  })

        for (let i = 0; i < URLS.length; i++) {
            const URL = URLS[i]
            await new Promise(async (resolve, reject) => {
                console.log(URL)

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
        
                if (resp.status == 200) interaction.followUp({content: `An internal system error has occurred. Please try again or contact the admin!\n${URL}`, ephemeral: true})
        
                resolve()
            }).catch ( () => {
                interaction.followUp({content: `Invalid URL: \n${hideLinkEmbed(hyperlink(URL))}`, ephemeral: true})
            })
        }    

        interaction.editReply("Done!")
  
    }
}