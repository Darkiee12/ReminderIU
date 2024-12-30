import { EmbedBuilder, Message, MessagePayload } from "discord.js";
import BaseReminder from "./base";
import UserService from "../services/UserService";
import { Err, isErr, Ok, Result } from "../utils/types";
import CalendarService from "../services/CalendarService";

export class CalendarReminder extends BaseReminder{
    private map: {[key: string]: Function};
    private constructor(message: Message<true>, args: string[], user: UserService){
        super(message, args, user);
        this.map = this.dict();
    }
    dict(): { [key: string]: Function; } {
        return{
            "get": this.getIdx.bind(this),
            "create": this.create.bind(this),
            "update": this.update.bind(this),
            "delete": this.deleteById.bind(this)
        }
    }

    help(): void{
        const embed = new EmbedBuilder()
            .setTitle("📅 Calendar Reminder Help")
            .setDescription(
                "**Usage:** `!remindme calendar <subcommand> [options]`\n\n**Subcommands:**\n- get\n- getAll\n- getAllByTag\n- create\n- update\n- delete\n\nOptions:\n- t: Title (required)\n- d: Description (optional)\n- on: Date (required)\n- time: Time (required)\n- at: Location (optional)"
            )
            .setColor("#1E90FF")
            .setFooter({
                text: "Reminder IU",
                iconURL: "https://example.com/help-icon.png",
            });
        this.send({ embeds: [embed] });
    }

    private parseOptions(args: string[]): Result<Record<string, string | undefined>> {
        const options: Record<string, string | undefined> = {
            t: undefined, // Title (required)
            d: undefined, // Description (optional)
            on: undefined, // Date (required)
            time: undefined, // Time (optional)
            at: undefined, // Location (optional),
        };
    
        let currentKey: string | null = null;
    
        for (const arg of args) {
            if (arg.startsWith("--")) {
                currentKey = arg.slice(2);
                if (!(currentKey in options)) {
                    return Err(`❌Unknown option: --${currentKey}`);
                }
                if (options[currentKey] !== undefined) {
                    return Err(`❌Duplicate option: --${currentKey}`);
                }
            } else if (currentKey) {
                options[currentKey] = (options[currentKey] || "") + (options[currentKey] ? " " : "") + arg;
            } else {
                return Err(`❌Unexpected argument: ${arg}`);
            }
        }
    
        // Check for missing required arguments
        if (!options.t) return Err("❌Missing required option: --t (title)");
        if (!options.on) return Err("❌Missing required option: --on (date)");
        if (!options.time) return Err("❌Missing required option: --time (time)");
    
        return Ok(options);
    }
    

    static async init(message: Message<true>, args: string[], user: UserService): Promise<void>{
        const calendar = new CalendarReminder(message, args, user);
        await calendar.execute();
    }

    async execute(): Promise<void>{
        const subCommand = this.args.shift()?.toLowerCase();
        if (!subCommand || subCommand.toLowerCase() === "help") return this.help();
        const selection = this.map[subCommand];
        if (!selection){
            return await this.help();
        }
        return await selection();

    }

    async getIdx(): Promise<void>{
        const idx: {[key: string]: Function} = {
            "all": this.getAllActive.bind(this),
            "next": this.getNext.bind(this),
        }
        const options = this.args.shift()?.toLowerCase();
        if (!options) return await this.getNext();
        const selection = idx[options];
        if (!selection) return await this.getAllActive();
        return await selection();
        
    }

    async getAllActive(): Promise<void>{
        const events = this.user?.getActiveEvents();
        if (!events || events.length === 0) return await this.send("No events found");
        const [user, err] = await this.user?.toUser()!;
        if (err) return await this.send("User not found");
        const embeds = events.map((event) => {
            return new EmbedBuilder()
                .setAuthor({
                    name: user.displayName,
                    iconURL: user.displayAvatarURL()
                })
                .setTitle(event.title.toString())
                .setDescription(event.description || "No description was provided")
                .addFields([
                    { name: "ID", value: event.id.toString(), inline: true },
                    { name: "Date", value: event.date.toString(), inline: true },
                    { name: "Time", value: event.time.toString(), inline: true },
                    { name: "Timezone", value: this.user!.timezone.toString(), inline: true },
                    { name: "Location", value: event.location || "N/A", inline: true }
                ])

        });
        return await this.send({embeds: embeds})
    }

    async getNext(): Promise<void>{
        const event = this.user?.getNextEvent();

        if (!event) {
        const noEventEmbed = new EmbedBuilder()
            .setTitle("📅 No Upcoming Events")
            .setDescription("You have no upcoming events in your calendar. Relax 😊")
            .setColor("#FFD700")
            .setFooter({
                text: "Use `!remindme calendar create` to add a new event.",
                iconURL: "https://example.com/no-events-icon.png",
            });
        return await this.send({ embeds: [noEventEmbed] });
    }

        const [user, err] = await this.user?.toUser()!;

        if (err) {
        const errorEmbed = new EmbedBuilder()
            .setTitle("❌ User Not Found")
            .setColor("#FF0000")
            .setFooter({
                iconURL: "https://example.com/error-icon.png",
            });
        return await this.send({ embeds: [errorEmbed] });
    }

        const embed = new EmbedBuilder()
            .setAuthor({
                name: user.displayName,
                iconURL: user.displayAvatarURL()
            })
            .setTitle(`🔔 Upcoming Event: ${event.title}`)
            .setDescription(event.description || "No description was provided")
            .setColor("#1E90FF")
            .addFields([
                { name: "🆔 Event ID", value: event.id.toString(), inline: true },
                { name: "📅 Date", value: event.date.toString(), inline: true },
                { name: "⏰ Time", value: event.time.toString(), inline: true },
                { name: "🌍 Timezone", value: this.user!.timezone.toString(), inline: true },
                { name: "📍 Location", value: event.location || "N/A", inline: true },
            ])
            .setFooter({
                text: "Reminder IU",
                iconURL: "https://example.com/calendar-icon.png",
            })
        return await this.send({embeds: [embed]});
    }


    async getAllByTag(): Promise<void>{}

    async create(): Promise<void>{
        const [options, errPrse] = this.parseOptions(this.args);
        if (errPrse){
            const errorEmbed = new EmbedBuilder()
                .setTitle("⚠️ Invalid Command")
                .setDescription(
                    `${errPrse.message}\n\n**Usage:**\n\`!reminder calendar create --t <title> --on <date> --time <time> [--d <description>] [--at <location>]\``
                )
                .setColor("#FF6347");
            return await this.send({ embeds: [errorEmbed] });
        }
        const { t, d, on, time, at } = options
        const [event, errEv] = CalendarService.fromJSON({
            id: Date.now(),
            title: t || "",
            description: d,
            date: on!,
            time: time!,
            location: at,
            tags: []
        });
        if (errEv) return await this.send(errEv.message);
    
        const [_, err] = this.user?.addEvent(event)!;
        if (err) return await this.send(err.message);
        const unix = event.unixDiff(this.user?.timezone!);
        if (unix < 0) {
            const errorEmbed = new EmbedBuilder()
                .setTitle("❌ Invalid Event Time")
                .setDescription("Event must be in the future!")
                .setColor("#FF0000");
            return await this.send({ embeds: [errorEmbed] });
        }

        const embed = new EmbedBuilder()
            .setTitle("🎉 Event Created Successfully!")
            .setDescription(
                `**Title:** ${event.title}\n**Date:** ${event.date}\n**Time:** ${event.time}`
            )
            .setColor("#32CD32")
            .setFooter({
                text: "Reminder IU",
                iconURL: "https://example.com/success-icon.png",
            });

        setTimeout(async () => {
            const reminderEmbed = new EmbedBuilder()
                .setTitle("⏰ Calendar was set!")
                .setDescription(`**Event:** ${event.title}\n**Date:** ${event.date}\n**Time:** ${event.time}`)
                .setColor("#FFD700")
            await this.send({
                content: `${this.user?.mention()}`,
                embeds: [reminderEmbed],
            });
        }, unix);
        return await this.send({embeds:[embed]});
    }

    async update(): Promise<void>{}

    async deleteById(): Promise<void>{
        const id = this.args.shift()?.toLowerCase();
        if (!id) {
            const errorEmbed = new EmbedBuilder()
                .setTitle("❌ Missing Argument")
                .setDescription("You must provide the ID of the event to delete.\n\n**Usage:** `!remindme calendar delete <id>`")
                .setColor("#FF0000");
            return await this.send({ embeds: [errorEmbed] });
        }
        const [_, err] = this.user?.deleteEvent(Number(id))!;

        if (err) {
            const errorEmbed = new EmbedBuilder()
                .setTitle("❌ Wrong Event ID")
                .setDescription(`Could not delete event with ID **${id}**.\n**Reason:** ${err.message}`)
                .setColor("#FF0000")
                .setFooter({
                    text: "Please check the event ID and try again.",
                    iconURL: "https://example.com/error-icon.png",
                });
            return await this.send({ embeds: [errorEmbed] });
        }

        const successEmbed = new EmbedBuilder()
            .setTitle("🗑️ Event Deleted Successfully")
            .setDescription(`Event with ID **${id}** has been deleted.`)
            .setColor("#32CD32")
            .setFooter({
                text: "Reminder IU",
                iconURL: "https://example.com/success-icon.png",
        });

        return await this.send({ embeds: [successEmbed] });
    }

}