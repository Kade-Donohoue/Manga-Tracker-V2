const BaseSubcommandExecutor = require("../../utils/BaseSubCommandExecutor");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, ComponentType, StringSelectMenuBuilder  } = require("discord.js")
const config = require('../../../data/config.json')

const cancelButton = new ButtonBuilder()
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Secondary)
    .setCustomId('cancel')
const confirmButton =  new ButtonBuilder()
    .setLabel('Confirm')
    .setStyle(ButtonStyle.Danger)
    .setCustomId('confirm')

const row = new ActionRowBuilder()
    .setComponents(cancelButton, confirmButton)

module.exports = class mangaforgetMeSubCommand extends BaseSubcommandExecutor {
    constructor(baseCommand, group) {
        super(baseCommand, group, 'forgetme')
    }

    async run(client, interaction) {

        // return interaction.reply({ content: 'Currently not supported. Support is coming soon. please contact bot owner to be removed!', ephemeral: true })

        const response = await interaction.reply({ content: 'Are you sure you want to PERMANENTLY REMOVE ALL your tracked manga?', components: [row], ephemeral: true})
        const filter = (i) => i.user.id === interaction.user.id
        const collector = response.createMessageComponentCollector({
            ComponentType: ComponentType.Button, 
            filter: filter
        })
        collector.on('collect', (async interact => {
            if (interact.customId == 'cancel' ) interact.update({content: 'Cancelled', components: []})
            if (interact.customId == 'confirm') {
                console.log("Deleted User!!!!!!!!!!!")
                
                const resp = await fetch(`${config.serverUrl}/api/data/remove/forgetUser`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        "access_token": null,
                        "authId": interaction.user.id,
                    })
                })

                if (resp.status == 200) return interact.update({content: 'All your data has been successfully removed!', components: []})
                    interact.update({content: 'An unknown error has ocurred! Please try again or contact the bot owner.', components: []})
            }
        }))
    }
}