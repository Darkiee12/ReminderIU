import { Client } from 'discord.js';
import fs from 'fs';
import path from 'path';

export const loadEvents = (client: Client): void => {
    const eventsPath = path.resolve(__dirname, '../events');
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.ts'));
    // random comment
    for (const file of eventFiles) {
        const event = require(`${eventsPath}/${file}`);
        const eventName = file.split('.')[0];

        if (typeof event.execute === 'function') {
            client.on(eventName, (...args) => event.execute(client, ...args));
            console.debug(`Event loaded: ${eventName}`);
        }
    }
};