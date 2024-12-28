import { Client, Message } from 'discord.js';
import { envVars } from '..';

export const execute = async (client: Client, message: Message): Promise<void> => {
    const prefix = envVars.get('PREFIX') || '!';

    if (message.author.bot || !message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift()?.toLowerCase();

    if (command === 'ping') {
        await message.reply(`Ping is ${client.ws.ping}ms.`);
    }
};