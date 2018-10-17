import { TextChannel, Message } from "discord.js";
import fs = require("fs")

export class Store {
    store: {
        sendFlag: {[guildId: string]: {[channelId: string]: {[feedUrl: string]: {[url: string]: string}}}}
    } = {
        sendFlag: {}
    }

    constructor(public fileName: string) {
        if (fs.existsSync(fileName)) {
            this.store = JSON.parse(fs.readFileSync(fileName, {
                encoding: "UTF-8"
            }))
        }
    }

    save() {
        fs.writeFileSync(this.fileName, JSON.stringify(this.store, null, 4))
    }

    isAlreadySended(channel: TextChannel, feedUrl: string, url: string): boolean {
        if (this.store.sendFlag[channel.guild.id] == null) return false
        if (this.store.sendFlag[channel.guild.id][channel.id] == null) return false
        if (this.store.sendFlag[channel.guild.id][channel.id][feedUrl] == null) return false
        if (this.store.sendFlag[channel.guild.id][channel.id][feedUrl][url] == null) return false
        return true
    }

    setSendFlag(channel: TextChannel, feedUrl: string, url: string, message: Message) {
        if (this.store.sendFlag[channel.guild.id] == null) {
            this.store.sendFlag[channel.guild.id] = {}
        }
        if (this.store.sendFlag[channel.guild.id][channel.id] == null) {
            this.store.sendFlag[channel.guild.id][channel.id] = {}
        }
        if (this.store.sendFlag[channel.guild.id][channel.id][feedUrl] == null) {
            this.store.sendFlag[channel.guild.id][channel.id][feedUrl] = {}
        }
        this.store.sendFlag[channel.guild.id][channel.id][feedUrl][url] = message.id
        this.save()
    }
}