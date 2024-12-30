import { Message } from "discord.js";
import { QuickReminder } from "./quick";
import { Misc } from "./misc";
import UserService from "../services/UserService";
import { CalendarReminder } from "./calendar";

export class IndexReminder{
    constructor(private map = this.dict()){}
    async execute(message: Message<true>, args: string[]){
        const subCommand = args.shift()?.toLowerCase();
        if(!subCommand) return Misc.init(message, args);
        const category = this.map[subCommand];
        if(!category){
            args.unshift(subCommand);
            return Misc.init(message, args);
        }
        const [user, usrErr] = UserService.load(message.author.id);
        if(usrErr){
            return await message.channel.send("User not registered! Please register using !remindme register timezone");
        }
        await category(message, args, user);
    }

    dict(): {[key: string]: Function}{
        return {
            "quick": QuickReminder.init,
            "help": Misc.init,
            "calendar": CalendarReminder.init
        };
    }

    


}