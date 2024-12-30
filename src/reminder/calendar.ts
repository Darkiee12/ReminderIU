import { Message, MessagePayload } from "discord.js";
import BaseReminder from "./base";
import UserService from "../services/UserService";
import { Err, Ok, Result } from "../utils/types";
import CalendarService from "../services/CalendarService";

export class CalendarReminder extends BaseReminder{
    private map: {[key: string]: Function};
    private constructor(message: Message<true>, args: string[], user: UserService){
        super(message, args, user);
        this.map = this.dict();
    }
    dict(): { [key: string]: Function; } {
        return{
            "get": this.get.bind(this),
            "getAll": this.getAll.bind(this),
            "getAllByTag": this.getAllByTag.bind(this),
            "create": this.create.bind(this),
            "update": this.update.bind(this),
            "delete": this.deleteById.bind(this)
        }
    }

    help(): void{
        this.send("**Help:** Usage: !reminder calendar <subcommand> [options]\n\nSubcommands:\n- get\n- getAll\n- getAllByTag\n- create\n- update\n- delete\n\nOptions:\n- t: Title (required)\n- d: Description (optional)\n- on: Date (required)\n- time: Time (required)\n- at: Location (optional)");
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
                    return Err(`Unknown option: --${currentKey}`);
                }
                if (options[currentKey] !== undefined) {
                    return Err(`Duplicate option: --${currentKey}`);
                }
            } else if (currentKey) {
                options[currentKey] = (options[currentKey] || "") + (options[currentKey] ? " " : "") + arg;
            } else {
                return Err(`Unexpected argument: ${arg}`);
            }
        }
    
        // Check for missing required arguments
        if (!options.t) return Err("Missing required option: --t (title)");
        if (!options.on) return Err("Missing required option: --on (date)");
        if (!options.time) return Err("Missing required option: --time (time)");
    
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

    async get(): Promise<void>{

    }

    async getAll(): Promise<void>{}

    async getAllByTag(): Promise<void>{}

    async create(): Promise<void>{
        const [options, errPrse] = this.parseOptions(this.args);
        if (errPrse) return await this.send(`${errPrse.message}\nUsage: !reminder calendar create --t <title> --on <date> --time <time> [--d <description>] [--at <location>]`);
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
        this.user?.addEvent(event);
        const unix = event.unixDiff(this.user?.timezone!);
        if (unix < 0) return await this.send("Event must be in the future!");
        this.user?.dump();
        setTimeout(async () => {
            await this.send(`${this.user?.mention()} Calendar was set: ${event.title.toString()}`);
        }, unix);
        return await this.send(`Event created successfully`);
    }

    async update(): Promise<void>{}

    async deleteById(): Promise<void>{}

}