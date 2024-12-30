import { EmbedBuilder, Message, MessagePayload, User } from "discord.js";
import BaseReminder from "./base";
import UserService from "../services/UserService";
import { Err, i32, isErr, Ok, Result, TimeZone } from "../utils/types";
import CalendarService from "../services/CalendarService";
import { matchesGlob, parse } from "path";
const icon = {
    "error": "https://www.svgrepo.com/show/503021/error.svg",
    "tick": "https://www.svgrepo.com/show/520990/tick.svg",
    "calendar": "https://www.svgrepo.com/show/533401/calendar-week.svg",
    "help": "https://www.svgrepo.com/show/507734/help-alt.svg",
    "noEvent": "https://www.svgrepo.com/show/533404/calendar-xmark-alt.svg"
}

const noEventEmbed = new EmbedBuilder()
    .setTitle("📅 No Upcoming Events")
    .setDescription("You have no upcoming events in your calendar. Relax 😊")
    .setColor("#FFD700")
    .setFooter({
        text: "Use `!remindme calendar create` to add a new event.",
        iconURL: icon.noEvent,
    });

const userNotFoundEmbed = new EmbedBuilder()
    .setTitle("❌ User Not Found")
    .setDescription("Could not find the user for this event.")
    .setColor("#FF0000")
    .setFooter({
        text: "Please try again later.",
        iconURL: icon.error,
    });

const buildEmbed = (event: CalendarService, user: User, tz: TimeZone) => {
    return new EmbedBuilder()
        .setAuthor({
            name: user.username,
            iconURL: user.displayAvatarURL()
        })
        .setTitle(`🔔 Event: ${event.title}`)
        .setDescription(event.description || "No description was provided")
        .setColor("#1E90FF")
        .addFields([
            { name: "🆔", value: event.id.toString(), inline: true },
            { name: "📅", value: event.date.toString(), inline: true },
            { name: "⏰", value: event.time.toString(), inline: true },
            { name: "🌍", value: tz.toString(), inline: true },
            { name: "📍", value: event.location || "N/A", inline: true },
        ])
        .setFooter({
            text: "Reminder IU",
            iconURL: icon.calendar,
        });
}
const timeouts: {[key: string]: NodeJS.Timeout} = {}
export class CalendarReminder extends BaseReminder {
    private map: { [key: string]: Function };
    private constructor(message: Message<true>, args: string[], user: UserService) {
        super(message, args, user);
        this.map = this.dict();
    }
    dict(): { [key: string]: Function; } {
        return {
            "get": this.getIdx.bind(this),
            "create": this.create.bind(this),
            "update": this.update.bind(this),
            "delete": this.deleteById.bind(this)
        }
    }

    help(): void {
        const embed = new EmbedBuilder()
            .setTitle("📅 Calendar Reminder Help")
            .setDescription(
                "**Usage:** `!remindme calendar <subcommand> [options]`\n\n**Subcommands:**\n- get\n- getAll\n- getAllByTag\n- create\n- update\n- delete\n\nOptions:\n- t: Title (required)\n- d: Description (optional)\n- on: Date (required)\n- time: Time (required)\n- at: Location (optional)"
            )
            .setColor("#1E90FF")
            .setFooter({
                text: "Reminder IU",
                iconURL: icon.help,
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


    static async init(message: Message<true>, args: string[], user: UserService): Promise<void> {
        const calendar = new CalendarReminder(message, args, user);
        await calendar.execute();
    }

    async execute(): Promise<void> {
        const subCommand = this.args.shift()?.toLowerCase();
        if (!subCommand || subCommand.toLowerCase() === "help") return this.help();
        const selection = this.map[subCommand];
        if (!selection) {
            return await this.help();
        }
        return await selection();

    }

    async getIdx(): Promise<void> {
        const idx: { [key: string]: Function } = {
            "all": this.getAllActive.bind(this),
            "next": this.getNext.bind(this),
            "target": this.getById.bind(this)
        }
        const options = this.args.shift()?.toLowerCase();
        if (!options) return await this.getNext();
        const selection = idx[options];
        if (!selection) return await this.getAllActive();
        return await selection();

    }

    async getById(): Promise<void> {
        const id = this.args.shift()?.toLowerCase();
        if (!id) return await this.send("Please provide an event ID");
        const event = this.user?.findEvent(Number(id));
        if (!event) return await this.send("Event not found");
        const user = await this.message.author;
        const embed = buildEmbed(event, user, this.user!.timezone);

        return await this.send({ content: `${this.user?.mention()}`,embeds: [embed] });
    }

    async getAllActive(): Promise<void> {
        const events = this.user?.getActiveEvents();
        if (!events || events.length === 0) return await this.send({ embeds: [noEventEmbed] });
        const [user, err] = await this.user?.toUser()!;
        if (err) return await this.send("User not found");
        const embeds = events.map((event) => {
            return buildEmbed(event, user, this.user!.timezone);
        });
        return await this.send({ content: `${this.user?.mention()}`, embeds: embeds })
    }

    async getNext(): Promise<void> {
        const event = this.user?.getNextEvent();

        if (!event) {
            return await this.send({ embeds: [noEventEmbed] });
        }

        const [user, err] = await this.user?.toUser()!;

        if (err) {
            return await this.send({ embeds: [userNotFoundEmbed] });
        }

        const embed = buildEmbed(event, user, this.user!.timezone);
        return await this.send({ content: `${this.user?.mention()}`, embeds: [embed] });
    }

    async getAllByTag(): Promise<void> { }

    async create(): Promise<void> {
        const [options, errPrse] = this.parseOptions(this.args);
        if (errPrse) {
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
            .setDescription(`Event **${event.title}** has been added to your calendar.\n Description: ${event.description || "No description was provided"}`)
            .addFields([
                { name: "🆔 ID", value: event.id.toString(), inline: true },
                { name: "📅 Date", value: event.date.toString(), inline: true },
                { name: "⏰ Time", value: event.time.toString(), inline: true },
                { name: "🌍 Timezone", value: this.user!.timezone.toString(), inline: true },
                { name: "📍 Location", value: event.location || "N/A", inline: true },
            ])
            .setColor("#32CD32")
            .setFooter({
                text: "Reminder IU",
                iconURL: icon.tick,
            });

        const timeout = setTimeout(async () => {
            const [user, err] = await this.user?.toUser()!;
            if (err) {
                return await this.send({ embeds: [userNotFoundEmbed] });
            }
            const reminderEmbed = buildEmbed(event, user, this.user!.timezone);
            await this.send({ content: `${this.user?.mention()}`, embeds: [reminderEmbed] });
        }, unix);
        timeouts[event.id.toString()] = timeout
        return await this.send({ embeds: [embed] });
    }

    async update(): Promise<void> {
        const _id = this.args.shift()?.toLowerCase();
        if (!_id) {
            const errorEmbed = new EmbedBuilder()
                .setTitle("❌ Missing Argument")
                .setDescription("You must provide the ID of the event to update.\n\n**Usage:** `!remindme calendar update <id>`")
                .setColor("#FF0000");
            return await this.send({ embeds: [errorEmbed] });
        }
        const [id, errId] = i32.fromString(_id);
        if (errId) {
            const errorEmbed = new EmbedBuilder()
                .setTitle("❌ Invalid ID")
                .setDescription("Event ID must be a valid number.")
                .setColor("#FF0000");
            return await this.send({ embeds: [errorEmbed] });
        }
        //parse
        const [options, errPrse] = this.parseOptions(this.args);
        if (errPrse) {
            const errorEmbed = new EmbedBuilder()
                .setTitle("⚠️ Invalid Command")
                .setDescription(
                    `${errPrse.message}\n\n**Usage:**\n\`!reminder calendar update <id> --t <title> --on <date> --time <time> [--d <description>] [--at <location>]\``
                )
                .setColor("#FF6347");
            return await this.send({ embeds: [errorEmbed] });
        }
        const { t, d, on, time, at } = options;
        const [event, errEv] = CalendarService.fromJSON({
            id: id.value,
            title: t || "",
            description: d,
            date: on!,
            time: time!,
            location: at,
            tags: []
        });
        if (errEv) return await this.send(errEv.message);
        const [_, err] = this.user?.updateEvent(id, event)!;
        if (err) return await this.send({ embeds: [new EmbedBuilder().setTitle("❌ Error").setDescription(err.message).setColor("#FF0000")] });
        if(timeouts[id.toString()]){
            clearTimeout(timeouts[id.toString()]);
            delete timeouts[id.toString()];
        }
        timeouts[id.toString()] = setTimeout(async () => {
            const [user, err] = await this.user?.toUser()!;
            if (err) {
                return await this.send({ embeds: [userNotFoundEmbed] });
            }
            const reminderEmbed = buildEmbed(event, user, this.user!.timezone);
            await this.send({ content: `${this.user?.mention()}`, embeds: [reminderEmbed] });
        }, event.unixDiff(this.user?.timezone!));
        const embed = buildEmbed(event, this.message.author, this.user!.timezone);
        return await this.send({ embeds: [embed] });
    }

    async deleteById(): Promise<void> {
        const _id = this.args.shift()?.toLowerCase();
        if (!_id) {
            const errorEmbed = new EmbedBuilder()
                .setTitle("❌ Missing Argument")
                .setDescription("You must provide the ID of the event to delete.\n\n**Usage:** `!remindme calendar delete <id>`")
                .setColor("#FF0000");
            return await this.send({ embeds: [errorEmbed] });
        }
        const [id, errId] = i32.fromString(_id);
        if (errId) {
            const errorEmbed = new EmbedBuilder()
                .setTitle("❌ Invalid ID")
                .setDescription("Event ID must be a valid number.")
                .setColor("#FF0000");
            return await this.send({ embeds: [errorEmbed] });
        }
        const [_, err] = this.user?.deleteEvent(id)!;

        if (err) {
            const errorEmbed = new EmbedBuilder()
                .setTitle("❌ Wrong Event ID")
                .setDescription(`Could not delete event with ID **${id}**.\n**Reason:** ${err.message}`)
                .setColor("#FF0000")
                .setFooter({
                    text: "Please check the event ID and try again.",
                    iconURL: icon.error,
                });
            return await this.send({ embeds: [errorEmbed] });
        }

        const timeout = timeouts[id.toString()];
        if (timeout) {
            clearTimeout(timeout);
            delete timeouts[id.toString()];
        } else{
            console.log("timeout not found", JSON.stringify(timeouts, null, 2));
        }

        const successEmbed = new EmbedBuilder()
            .setTitle("🗑️ Event Deleted Successfully")
            .setDescription(`Event with ID **${id}** has been deleted.`)
            .setColor("#32CD32")
            .setFooter({
                text: "Reminder IU",
                iconURL: icon.tick,
            });

        return await this.send({ embeds: [successEmbed] });
    }

}