const { SlashCommandBuilder } = require('discord.js');
const BaseSlashSubCommand = require("../../utils/BaseSlashSubCommand");

module.exports = class MangaSubCommand extends BaseSlashSubCommand {
    constructor() {
        super('manga', [], ['latest', 'current', 'next', 'remove', 'add', 'bulkadd', 'allunread', 'card', 'feed', 'forgetme'])
    }

    getCommandJson() {
        return new SlashCommandBuilder()
        .setName(this.name)
        .setDescription('Get information on a Manga')
        .addSubcommand((subcommand) => subcommand 
            .setName('remove')
            .setDescription('allows you to remove selected manga (WIP)')
            .addStringOption((option) => option 
                .setName('your_title')
                .setDescription('Title of Manga')
                .setAutocomplete(true)
                .setRequired(true)
            )
        )
        .addSubcommand((subcommand) => subcommand 
            .setName('add')
            .setDescription('allows you to add selected manga to your list (WIP)')
            .addStringOption((option) => option 
                .setName('category')
                .setDescription('Category you want Manga in')
                .setRequired(true)
                .addChoices(
                    { name: 'Reading', value: 'reading' }, 
                    { name: 'Not Reading', value: 'notreading' },
                    { name: 'Hold', value: 'hold' },
                    { name: 'Hiatus', value: 'hiatus' },
                    { name: 'Finished', value: 'finished' }, 
                    { name: 'In Queue', value: 'inqueue' },
                    { name: 'Other', value: 'other' }
                )
            )
            .addStringOption((option) => option
                .setName('manga_url')
                .setDescription('URL for the Manga')
                .setRequired(true)
            )
        )
        .addSubcommand((subcommand) => subcommand 
            .setName('bulkadd')
            .setDescription('allows you to add selected mangas to your list (WIP)')
            .addStringOption((option) => option 
                .setName('category')
                .setDescription('Category you want Manga in')
                .setRequired(false)
                .addChoices(
                    { name: 'Reading', value: 'reading' }, 
                    { name: 'Not Reading', value: 'notreading' },
                    { name: 'Hold', value: 'hold' },
                    { name: 'Hiatus', value: 'hiatus' },
                    { name: 'Finished', value: 'finished' }, 
                    { name: 'In Queue', value: 'inqueue' },
                    { name: 'Other', value: 'other' }
                )
                .setRequired(true)
            )
            .addStringOption((option) => option
                .setName('manga_url')
                .setDescription('URL for the Manga separated by command and no spaces. EX: link1,link2,link3...')
                .setRequired(true)
            )
        )
        .addSubcommand((subcommand) => subcommand 
            .setName('card')
            .setDescription('Provides a card containing information of selected manga (WIP)')
            .addStringOption((option) => option 
                .setName('your_title')
                .setDescription('Title of Manga that you want to see the card of')
                .setAutocomplete(true)
                .setRequired(true)
            )
        )
        .addSubcommand((subcommand) => subcommand 
            .setName('feed')
            .setDescription('Provides cards of all unread manga one at a time')
            .addStringOption((option) => option 
                .setName('category')
                .setDescription('Select What Category you want the feed from (select nothing to use all)')
                .setRequired(false)
                .addChoices(
                    { name: 'Reading', value: 'reading' }, 
                    { name: 'Not Reading', value: 'notreading' },
                    { name: 'Hold', value: 'hold' },
                    { name: 'Hiatus', value: 'hiatus' },
                    { name: 'Finished', value: 'finished' }, 
                    { name: 'In Queue', value: 'inqueue' },
                    { name: 'Other', value: 'other' }
                )
            )
            .addStringOption((option) => option 
                .setName('sort-order')
                .setDescription('Select Order to sort by')
                .setRequired(false)
                .addChoices(
                    { name: 'Ascending', value: 'ASC' }, 
                    { name: 'descending', value: 'DESC' }
                )
            )
            .addStringOption((option) => option 
                .setName('sort-method')
                .setDescription('Select How to sort Manga')
                .setRequired(false)
                .addChoices(
                    { name: 'Alphabetical', value: 'ASC' }, 
                    { name: 'Time', value: 'DESC' }
                )
            )
        )
        .addSubcommand((subcommand) => subcommand 
            .setName('forgetme')
            .setDescription('Removes any data that tracks what you have read')
        )
        .addSubcommand((subcommand) => subcommand 
            .setName('mystats')
            .setDescription('Provides a card containing Statistics based on your tracked manga')
        )
        .toJSON()
    }
}