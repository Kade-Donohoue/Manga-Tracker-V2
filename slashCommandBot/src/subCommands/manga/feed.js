const { ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, ComponentType, StringSelectMenuBuilder  } = require("discord.js")
const BaseSubcommandExecutor = require("../../../src/utils/BaseSubCommandExecutor")
const { generateCard }  = require('../../../src/utils/cardGenerator')
const dataUtils = require('../../utils/dataUtils')
const config = require('../../../data/config.json')

const cancelButton = new ButtonBuilder()
    .setCustomId("cancel")
    .setLabel("Cancel")
    .setStyle(ButtonStyle.Danger)

const prevButton = new ButtonBuilder()
    .setCustomId('prev')
    .setLabel('Previous')
    .setStyle(ButtonStyle.Primary);

const nextButton = new ButtonBuilder()
    .setCustomId('next')
    .setLabel('Next')
    .setStyle(ButtonStyle.Primary);

const readButton = new ButtonBuilder()
    .setCustomId('read')
    .setLabel('Mark as Read')
    .setStyle(ButtonStyle.Success);

const linkButton = new ButtonBuilder()
    .setLabel('Open')
    .setStyle(ButtonStyle.Link);

const mangeReadSelection = new StringSelectMenuBuilder() 
    .setCustomId("select")
    .setPlaceholder("Select Where you Read to!!!")

const mangeCatSelection = new StringSelectMenuBuilder() 
    .setCustomId("catSelect")
    .setPlaceholder("Select a category!!!")
    .addOptions(
        { label: 'Reading', value: 'reading' }, 
        { label: 'Not Reading', value: 'notreading' },
        { label: 'Hold', value: 'hold' },
        { label: 'Hiatus', value: 'hiatus' },
        { label: 'Finished', value: 'finished' }, 
        { label: 'In Queue', value: 'inqueue' },
        { label: 'Other', value: 'other' }
    )  

const backButton = new ButtonBuilder()
    .setCustomId('backPrev')
    .setLabel('Back')
    .setStyle(ButtonStyle.Primary);

const catButton = new ButtonBuilder()
    .setCustomId('setCat')
    .setLabel('Change Category')
    .setStyle(ButtonStyle.Secondary);

var navigationRow = new ActionRowBuilder()
    .addComponents(prevButton, linkButton, readButton, nextButton)
var manageHomeRow = new ActionRowBuilder()
    .addComponents(cancelButton, catButton)

module.exports = class mangaFeedSubCommand extends BaseSubcommandExecutor {
    constructor(baseCommand, group) {
        super(baseCommand, group, 'feed')
    }

    async run(client, interaction) {
        const authID = interaction.user.id
        const userCat = interaction.options.getString('category') ?? '%'
        const sortMethod = interaction.options.getString('sort-method') ?? 'interactTime'
        const sortOrd = interaction.options.getString('sort-order') ?? 'ASC'

        await interaction.deferReply({ ephemeral: true })

        const resp = await fetch(`${config.serverUrl}/api/data/pull/getUnread`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                "access_token": null,
                "authId": authID,
                "userCat": userCat,
                "sortOrd": sortOrd,
                "sortMeth": sortMethod
            }),
        })

        if (resp.status!= 200) return interaction.reply({ content: "You have no Unread manga!", ephemeral: true })

        var respData = await resp.json()
        console.log(respData)

        // for (var i = 0; i < respData.mangaData.length; i++) {
        //     respData.mangaData[i].urlList = respData.mangaData[i].urlList.split(',')
        //     respData.mangaData[i].chapterTextList = respData.mangaData[i].chapterTextList.split(',')
        // }

        manageCardHandler(interaction, respData.mangaData, respData.userData)
        
        // getUnread(authID, userCat, sortMethod, sortOrd).then(async ([names, nextLinks, nextChap, currentChap, currentCat]) => {
        //     if (names.length == 0) return interaction.reply({ content: "You have no Unread manga!", ephemeral: true })

        //     await interaction.deferReply({ ephemeral: true })

        //     manageCardHandler(names, nextLinks, nextChap, currentChap, interaction, currentCat)
        // })
    }
}

/**
 * Manages providing new cards and handling button presses for feed command
 * @param names: List of Manga Names
 * @param nexts: List of Next Chapter URL
 * @param nextChaps: List of Next Chapter Card Text
 * @param currentChaps: List of Current Chapter Card Text
 * @param interaction: interaction to reply to
 * @returns Nothing 
 */
// async function manageCardHandler(names, nexts, nextChaps, currentChaps, interaction, userCat) {
async function manageCardHandler(interaction, mangaData, userData) {
    var currentIndex = 0
    console.log(userData)
    var currentMangaChapIndex = parseInt(userData[currentIndex].currentIndex)
    var msg = await feedCardMaker(
        mangaData[currentIndex].mangaName, 
        mangaData[currentIndex].urlList[currentMangaChapIndex], 
        mangaData[currentIndex].urlList[currentMangaChapIndex+1], 
        mangaData[currentIndex].chapterTextList[currentMangaChapIndex], 
        mangaData[currentIndex].chapterTextList[currentMangaChapIndex+1], 
        mangaData[currentIndex].chapterTextList.at(-1), 
        mangaData[currentIndex].chapterTextList.length, 
        mangaData[currentIndex].updateTime,
        mangaData[currentIndex].mangaId
    )
    msg.content = `${currentIndex+1} / ${userData.length} Unread Manga`
    response = await interaction.editReply(msg)


    const filter = (i) => i.user.id === interaction.user.id //filters button clicks to only the user that ran the feed command
    const collector = response.createMessageComponentCollector({
        ComponentType: ComponentType.Button, 
        filter: filter,
        time: 14.5*60*1000 
    })
    collector.on('collect', ( async interact => {
        await interact.update({ content: "Updating Please Wait...", components: []})

        if (interact.customId == 'cancel' ) { //sets message to cancelled and stops collector
            await interact.editReply({content: "Cancelled", files: [], components: []})
            collector.stop()
        }

        if (interact.customId == 'next' ) { //updates card to next card 
            fetch(`${config.serverUrl}/api/data/update/updateInteractTime`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    "access_token": null,
                    "authId": interaction.user.id,
                    "mangaId": mangaData[currentIndex].mangaId,
                    "interactionTime": Date.now()
                }),
            })
            // dataUtils.userInteractTime(interaction.user.id, mangaData[currentIndex].mangaName) // needs reimplemented
            currentIndex += 1
            // console.log(currentMangaChapIndex)
            if (currentIndex < mangaData.length) {
                currentMangaChapIndex = parseInt(userData[currentIndex].currentIndex)
                const cardMessage = await feedCardMaker(
                    mangaData[currentIndex].mangaName, 
                    mangaData[currentIndex].urlList[currentMangaChapIndex], 
                    mangaData[currentIndex].urlList[currentMangaChapIndex+1], 
                    mangaData[currentIndex].chapterTextList[currentMangaChapIndex], 
                    mangaData[currentIndex].chapterTextList[currentMangaChapIndex+1], 
                    mangaData[currentIndex].chapterTextList.at(-1), 
                    mangaData[currentIndex].chapterTextList.length, 
                    mangaData[currentIndex].updateTime,
                    mangaData[currentIndex].mangaId
                )
                cardMessage.content = `${currentIndex+1} / ${mangaData.length} Unread Manga`
                console.log(cardMessage)
                await interact.editReply(cardMessage)
            } else  {
                await interact.editReply({ content: "You are all caught up!!!", files: [], components: []})
            }
        }

        if (interact.customId == 'prev' ) { //updates card to next card 
            fetch(`${config.serverUrl}/api/data/update/updateInteractTime`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    "access_token": null,
                    "authId": interaction.user.id,
                    "mangaId": mangaData[currentIndex].mangaId,
                    "interactionTime": Date.now()
                }),
            })
            currentIndex += -1
            if (currentIndex >= 0) {
                currentMangaChapIndex = parseInt(userData[currentIndex].currentIndex)
                const cardMessage = await feedCardMaker(
                    mangaData[currentIndex].mangaName, 
                    mangaData[currentIndex].urlList[currentMangaChapIndex], 
                    mangaData[currentIndex].urlList[currentMangaChapIndex+1], 
                    mangaData[currentIndex].chapterTextList[currentMangaChapIndex], 
                    mangaData[currentIndex].chapterTextList[currentMangaChapIndex+1], 
                    mangaData[currentIndex].chapterTextList.at(-1), 
                    mangaData[currentIndex].chapterTextList.length, 
                    mangaData[currentIndex].updateTime,
                    mangaData[currentIndex].mangaId
                )
                cardMessage.content = `${currentIndex+1} / ${mangaData.length} Unread Manga`
                await interact.editReply(cardMessage)
                // dataUtils.userInteractTime(interaction.user.id, names[currentIndex])
            } else  {
                currentIndex = 0
                currentMangaChapIndex = parseInt(userData[currentIndex].currentIndex)
                await interact.editReply({ content: "Nothing Before this one!", components: [navigationRow, manageHomeRow]})
            }    
        }

        if (interact.customId == 'read') { // replace buttons with dropdown to select current chap(limited to next 25 chaps)
            const nextList = dataUtils.getNextList(mangaData[currentIndex].chapterTextList, currentMangaChapIndex, 25)
            // console.log(nextList)
            mangeReadSelection.setOptions(nextList)
            const row = new ActionRowBuilder()
                .addComponents(mangeReadSelection)
            const row2 = new ActionRowBuilder()
                .addComponents(backButton)
                await interact.editReply({ components: [row2,row]})
        }

        if (interact.customId == 'backPrev') { // returns buttons
            const cardMessage = await feedCardMaker(
                mangaData[currentIndex].mangaName, 
                mangaData[currentIndex].urlList[currentMangaChapIndex], 
                mangaData[currentIndex].urlList[currentMangaChapIndex+1], 
                mangaData[currentIndex].chapterTextList[currentMangaChapIndex], 
                mangaData[currentIndex].chapterTextList[currentMangaChapIndex+1], 
                mangaData[currentIndex].chapterTextList.at(-1), 
                mangaData[currentIndex].chapterTextList.length, 
                mangaData[currentIndex].updateTime,
                mangaData[currentIndex].mangaId
            )
            await interact.editReply({ content: `${currentIndex+1} / ${mangaData.length} Unread Manga`, components: cardMessage.components })
        }

        if (interact.customId == 'select') { // updates current chap and goes to the next card
            currentIndex+=1
            currentMangaChapIndex = parseInt(userData[currentIndex].currentIndex)
            if (currentIndex < mangaData.length) {
                const cardMessage = await feedCardMaker(
                    mangaData[currentIndex].mangaName, 
                    mangaData[currentIndex].urlList[currentMangaChapIndex], 
                    mangaData[currentIndex].urlList[currentMangaChapIndex+1], 
                    mangaData[currentIndex].chapterTextList[currentMangaChapIndex], 
                    mangaData[currentIndex].chapterTextList[currentMangaChapIndex+1], 
                    mangaData[currentIndex].chapterTextList.at(-1), 
                    mangaData[currentIndex].chapterTextList.length, 
                    mangaData[currentIndex].updateTime,
                    mangaData[currentIndex].mangaId
                )
                cardMessage.content = `${currentIndex+1} / ${mangaData.length} Unread Manga`
                await interact.editReply(cardMessage)
            } else await interact.editReply({ content: "You are all caught up!!!", files: [], components: []})

            const res = await fetch(`${config.serverUrl}/api/data/update/updateCurrentIndex`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    "access_token": null,
                    "authId": interaction.user.id,
                    "newIndex": interact.values[0],
                    "mangaId": mangaData[currentIndex-1].mangaId
                }),
            })

            if (res.status!=200) interact.followUp({ content: `An internal system error has occurred updating ${mangaData[currentIndex-1].mangaName}. Please try again or contact the admin`, ephemeral: true })
        }

        if (interact.customId == 'setCat') { // brings up buttons to allow user to change category
            const catRow = new ActionRowBuilder()
                .addComponents(mangeCatSelection)
            const manageRow = new ActionRowBuilder()
                .addComponents(backButton)
            await interact.editReply({ components: [manageRow,catRow]})
        }

        if (interact.customId == 'catSelect') { // changes category of manga based on user selection
            const res = await fetch(`${config.serverUrl}/api/data/update/changeMangaCat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    "access_token": null,
                    "authId": interaction.user.id,
                    "newCat": interact.values[0],
                    "mangaId": mangaData[currentIndex].mangaId
                }),
            })

            if (res.status!=200) interact.followUp({ content: `An internal system error has occurred updating ${mangaData[currentIndex-1].mangaName}. Please try again or contact the admin`, ephemeral: true })

            await interact.editReply({ components: [navigationRow, manageHomeRow]  })
        }
    }))

    collector.on('end', ( async () => {
        interaction.editReply({ content: `Interaction Timed out please run </manga feed:${interaction.commandId}> again to continue! `, files: [], components: [], ephemeral: true})
    }))
}

/**
     * Provides dictionary for discord message containing both a card and its buttons
     * @param name: Name of the Manga
     * @param nextURL: URL of the next chapter
     * @param currentText: Text to put as current chapter on card
     * @param nextText: Text to put as next chapter on card
     * @param latestText: Text to put as latest chapter on card
     * @param totalText: number for the total number of chapters to put on card
     * @param updateTime: time the manga was last updated
     * @returns dictionary with the keys content with its value as an empty string, files and its data is a card image, components, containing main buttons, and ephemeral set to true 
     */
async function feedCardMaker(name, currentUrl, nextURL, currentText, nextText, latestText, totalText, updateTime, mangaId) {
    console.log(latestText)
    if (nextText == undefined) {
        nextText = currentText
        nextURL = currentUrl
    }
    const cardData = await generateCard(name.toString(), latestText, currentText, nextText, (totalText).toString() + " Chapters", updateTime, mangaId)
    const attach = new AttachmentBuilder(cardData, { name: `${name.substring(0, 25)}-card.png`})
    console.log(name)
    linkButton.setURL(String(nextURL))

    navigationRow.setComponents(prevButton, linkButton, readButton, nextButton)
    manageHomeRow.setComponents(cancelButton, catButton)

    // console.log(attach)
    return { content: "", files: [attach], components: [navigationRow, manageHomeRow], ephemeral: true }
}