import { Message } from "discord.js";
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
            await this.message.reply('Usage: !remindme <time> <message>. Example: !remindme 10s say hi IU');
            return;
        }

        const timePattern = /^\d+(s|m|h|d)$/;
        const timeArg = this.args.shift();

        if (!timePattern.test(timeArg!)) {
            await this.message.reply('Invalid time format. Use s (seconds), m (minutes), h (hours), or d (days). Example: 10s, 5m, 1h, 2d');
            return;
        }

        const duration = parseInt(timeArg!.slice(0, -1));
        const unit = timeArg!.slice(-1);
        let milliseconds = 0;

        switch (unit) {
            case 's':
                milliseconds = duration * 1000;
                break;
            case 'm':
                milliseconds = duration * 60 * 1000;
                break;
            case 'h':
                milliseconds = duration * 60 * 60 * 1000;
                break;
            case 'd':
                milliseconds = duration * 24 * 60 * 60 * 1000;
                break;
        }

        const reminderMessage = this.args.join(' ');
        const endTime = Date.now() + milliseconds;

        const localEndTime = new Date(endTime + this.user?.timezone.offset()!);

        const formattedTime = new Intl.DateTimeFormat('en-US', {
            hour12: false,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }).format(localEndTime);

        await this.send(`Got it! I'll remind you at ${formattedTime} (${this.user?.timezone.toString()}): ${reminderMessage}`);


        setTimeout(async () => {
            await this.send(`<@${this.message.author.id}> Reminder: ${reminderMessage}`);
        }, milliseconds);
    }
}
