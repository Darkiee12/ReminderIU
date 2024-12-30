import { User } from 'discord.js';
import { RUser } from '../models';
import { Err, Ok, PositiveBigInt, Result, TimeZone } from '../utils/types';
import * as fs from 'fs';
import path from 'path';
import CalendarService from './CalendarService';
const makePath = (id: PositiveBigInt) => `/workspaces/final/data/${id.value}.json`;
export default class UserService{
    /**
     * Creates an instance of a class with a unique identifier and a timezone.
     * 
     * @param id - A positive big integer representing the unique identifier.
     * @param timezone - The timezone associated with the user or entity.
     */
    private constructor(
        public id: PositiveBigInt, 
        public timezone: TimeZone,
        public tags: string[] = [],
        public events: CalendarService[] = []
    
    ){}
    static fromDiscord(user: User, tz: string): Result<UserService>{
        const [id, errId] = PositiveBigInt.fromString(user.id);
        if(errId){
            return Err(errId)
        }
        const [timezone, errTz] = TimeZone.fromString(tz);
        if(errTz){
            return Err(errTz);
        }
        return Ok(new UserService(id, timezone));
    }

    static fromJSON(user: RUser): Result<UserService>{
        const [id, errId] = PositiveBigInt.fromString(user.id);
        if(errId){
            return Err(errId);
        }
        const [timezone, errTz] = TimeZone.fromString(user.timezone);
        if(errTz){
            return Err(errTz);
        }
        console.log(`Loaded user ${id.value} successfully!`);
        return Ok(new UserService(id, timezone));
    }

    private toRUser(): RUser{
        return {
            id: this.id.value.toString(),
            timezone: this.timezone.value,
            tags: this.tags,
            events: this.events.map(event => event.toCalendarEvent())
        }
    }

    addEvent(event: CalendarService): void{
        this.events.push(event);
    }
    
    dump(): void {
        const filePath = makePath(this.id);
        const dirPath = path.resolve(path.dirname(filePath));
    
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    
        fs.writeFileSync(path.resolve(filePath), JSON.stringify(this.toRUser(), null, 2), 'utf8');
        console.log(`Dumped user ${this.id.value} at ${filePath}`);
    }

    static load(_id: string): Result<UserService>{
        const [id, errId] = PositiveBigInt.fromString(_id);
        if(errId){
            return Err(errId);
        }
        const filePath = makePath(id);
        if (!fs.existsSync(filePath)) {
            return Err(`User ${id} does not exist`);
        }
        const data = fs.readFileSync(filePath, 'utf8');
        const user: RUser = JSON.parse(data);
        return UserService.fromJSON(user);
    }

    mention(): string{
        return `<@${this.id.value}>`;
    }
}