const { Collection } = require("discord.js")

module.exports = class BaseSlashSubCommand {
    constructor(name, groups, subcommands) {
        this._name = name
        this._groups = groups
        this._subcommand = subcommands
        this._groupCommands = new Collection()
    }

    get name() {
        return this._name
    }

    get groups() {
        return this._groups
    }

    get subcommands() {
        return this._subcommand
    }

    get groupCommands() {
        return this._groupCommands
    }
}