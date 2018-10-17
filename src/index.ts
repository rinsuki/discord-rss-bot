import Discord, { TextChannel, Message, Channel } from "discord.js"
import RSSParser from "rss-parser"
import fetch from "node-fetch"
import { Store } from "./store";
import schedule from "node-schedule"
require("dotenv").config()

const client = new Discord.Client();
const store = new Store("./store.json")

function channelIsText(channel: Channel): channel is TextChannel {
    return channel.type === "text"
}

async function crawl() {
    for (const guild of client.guilds.array()) {
        for (const channel of guild.channels.array().filter(channelIsText)) {
            await crawlChannel(channel)
        }
    }
}

async function crawlChannel(channel: TextChannel) {
    console.log(channel.topic)
    const urlRegEx = /https?:\/\/[^ \n]+/.exec(channel.topic)
    if (!urlRegEx) {
        return
    }
    const url = urlRegEx[0]
    const parser = new RSSParser()
    const req = await fetch(url)
    const contentType = req.headers.get("Content-Type")
    if (contentType) {
        if (contentType.startsWith("text/html")) return
    }
    const text = await req.text()
    const feed = await parser.parseString(text)
    const items = feed.items
        .sort((a, b) => new Date(a.isoDate).getTime() - new Date(b.isoDate).getTime())
        .filter((_, i, {length: l}) => (l - i) <= 5)
        .filter(e => !store.isAlreadySended(channel, url, e.link))
    for (const item of items) {
        console.log(item)
        let messages = await channel.sendMessage([
            item.title,
            item.link
        ].join("\n"))
        if (!Array.isArray(messages)) messages = [messages]
        messages.forEach(message => store.setSendFlag(channel, url, item.link, message))
    }
}

client.on("ready", () => {
    console.log("yay im ready!")
    crawl()
})

var promiseChain = Promise.resolve()

schedule.scheduleJob("crawler", "0 0,30 * * * *", (nowDate) => {
    console.log("crawl fired", nowDate)
    promiseChain = promiseChain.then(() => {
        console.log("crawl starting... (now date, fired)", new Date(), nowDate)
        crawl()
    })
})

client.on("channelUpdate", (oldCh, newCh) => {
    console.log("modify ch", newCh.id)
    if (!channelIsText(oldCh) || !channelIsText(newCh)) return
    if (oldCh.topic === newCh.topic) return
    crawlChannel(newCh)
})

client.on("channelDelete", ch => {
    console.log("delete ch", ch.id)
    if (!channelIsText(ch)) return
    delete store.store.sendFlag[ch.guild.id][ch.id]
    store.save()
})

client.login(process.env.DISCORD_TOKEN)