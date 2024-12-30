import { Message } from "discord.js";
import BaseReminder from "./base";
import UserService from "../services/UserService";

export class Misc extends BaseReminder {
    private map: { [key: string]: () => Promise<void> };

    private constructor(message: Message<true>, args: string[]) {
        super(message, args);
        this.map = this.dict();
    }

    static async init(message: Message<true>, args: string[]) {
        const misc = new Misc(message, args);
        await misc.execute();
    }

    async execute() {
        const subCommand = this.args.shift()?.toLowerCase();
        if (!subCommand) return this.help();
        const category = this.map[subCommand];
        if (!category) {
            return await this.help();
        }
        return await category();
    }

    private async help() {
        await this.send("**Help:** Usage: Available subcommands: help, register");
    }

    private async register() {
        function localHelp() {
            return "This bot uses UTC time. To register please do !remindme register timezone. Example: !remindme register -5";
        }
        if (this.args.length < 1) return await this.send(localHelp());
        const [user, errUsr] = UserService.fromDiscord(this.message.author, this.args[0]);

        if (errUsr) {
            return await this.send(errUsr.message);
        }
        user?.dump();
        await this.send("Successfully registered!");
    }

    dict(): { [key: string]: () => Promise<void> } {
        return {
            "help": this.help.bind(this),
            "register": this.register.bind(this)
        };
    }
}
