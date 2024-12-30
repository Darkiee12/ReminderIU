import { Message, EmbedBuilder } from "discord.js";
import BaseReminder from "./base";
import UserService from "../services/UserService";

export class QuickReminder extends BaseReminder {
    protected constructor(message: Message<true>, args: string[], user: UserService) {
        super(message, args, user);
    }

    static async init(message: Message<true>, args: string[], user: UserService): Promise<void> {
        const reminder = new QuickReminder(message, args, user);
        await reminder.execute();
    }

    async execute(): Promise<void> {
        if (this.args.length < 2) {
            const embed = new EmbedBuilder()
                .setTitle("Quick Reminder Usage")
                .setDescription(
                    "To set a quick reminder, use the format:\n`!remindme quick <time> <message>`\n\n**Examples:**\n- `!remindme quick 10s say hi to IU`\n- `!remindme quick 5m finish the report`"
                )
                .setColor("#ffcc00")
                .setFooter({ text: "Reminder IU", iconURL: "https://example.com/reminder-icon.png" });
            await this.message.reply({ embeds: [embed] });
            return;
        }

        const timePattern = /^\d+(s|m|h|d)$/;
        const timeArg = this.args.shift();

        if (!timePattern.test(timeArg!)) {
            const embed = new EmbedBuilder()
                .setTitle("Invalid Time Format")
                .setDescription(
                    "Please use one of the following time formats:\n- `s` for seconds\n- `m` for minutes\n- `h` for hours\n- `d` for days\n\n**Examples:**\n- `10s`\n- `5m`\n- `1h`\n- `2d`"
                )
                .setColor("#ff0000")
                .setFooter({ text: "Reminder IU", iconURL: "https://example.com/reminder-icon.png" });
            await this.message.reply({ embeds: [embed] });
            return;
        }

        const duration = parseInt(timeArg!.slice(0, -1));
        const unit = timeArg!.slice(-1);
        let milliseconds = 0;

        switch (unit) {
            case "s":
                milliseconds = duration * 1000;
                break;
            case "m":
                milliseconds = duration * 60 * 1000;
                break;
            case "h":
                milliseconds = duration * 60 * 60 * 1000;
                break;
            case "d":
                milliseconds = duration * 24 * 60 * 60 * 1000;
                break;
        }

        const reminderMessage = this.args.join(" ");
        const endTime = Date.now() + milliseconds;

        const localEndTime = new Date(endTime + this.user?.timezone.offset()!);

        const formattedTime = new Intl.DateTimeFormat("en-US", {
            hour12: false,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        }).format(localEndTime);

        const embed = new EmbedBuilder()
            .setTitle("Quick Reminder Set!")
            .setDescription(
                `I will remind you at **${formattedTime} (${this.user?.timezone.toString()})** with the message:\n\n"${reminderMessage}"`
            )
            .setColor("#00ff00")
            .setFooter({ text: "Reminder IU", iconURL: "https://example.com/reminder-icon.png" })
            .setTimestamp(new Date(endTime));

        await this.send({ embeds: [embed] });

        setTimeout(async () => {
            const reminderEmbed = new EmbedBuilder()
                .setTitle("⏰ Reminder Time!")
                .setDescription(reminderMessage)
                .setColor("#ffcc00")
                .setFooter({ text: "Reminder Bot", iconURL: "https://example.com/reminder-icon.png" })
                .setTimestamp();

            await this.send({ content: `<@${this.message.author.id}>`, embeds: [reminderEmbed] });
        }, milliseconds);
    }
}
