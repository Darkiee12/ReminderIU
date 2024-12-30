import { Message, MessageCreateOptions, MessagePayload } from "discord.js";
import UserService from "../services/UserService";

export default abstract class BaseReminder{
    constructor(protected message: Message<true>, protected args: string[], protected user?: UserService){}
    static init(_message: Message<true>, _args: string[], _user: UserService): void{
        throw new Error('Method not implemented.');
    }
    abstract execute(_message: Message<true>, _args: string[]): Promise<void>
    async send(msg: string | MessagePayload | MessageCreateOptions): Promise<void>{
        this.message.channel.send(msg);
    }

}