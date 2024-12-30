import { Client, GatewayIntentBits } from 'discord.js';
// import { config } from 'dotenv';
import { loadEvents } from './handlers/eventHandler';
// config();

export const envVars = new Map<string, string | undefined>([['DISCORD_TOKEN', undefined], ['PREFIX', undefined]]);

for (const envVar of envVars) {
    if (!process.env[envVar[0]]) {
        console.error(`Environment variable ${envVar[0]} is not defined in .env`);
        process.exit(1);
    }
    envVars.set(envVar[0], process.env[envVar[0]]);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

loadEvents(client);

client.login(envVars.get('DISCORD_TOKEN')).then(() => {
    console.log(`Logged in as ${client.user?.username}`);
}).catch((err) => {
    console.error('Failed to log in:', err);
});