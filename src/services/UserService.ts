import { User } from 'discord.js';
import { RUser } from '../models';
import { Err, Ok, PositiveBigInt, Result, TimeZone } from '../utils/types';
import * as fs from 'fs';
import path from 'path';
import CalendarService from './CalendarService';
import client from '..';
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

    async toUser(): Promise<Result<User>>{
        try{
            const user = await client.users.fetch(this.id.value.toString());
            return Ok(user);
        }catch(err){
            return Err("User not found");
        }
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

    addEvent(event: CalendarService): Result<void>{
        if(event.isPast(this.timezone)){
            return Err("Event is in the past!");
        }
        this.unsafeLoad();
        this.events.push(event);
        this.dump();
        return Ok(void 0);
    }

    deleteEvent(id: number): Result<void>{
        this.unsafeLoad();
        const index = this.events.findIndex(event => event.id.value === id);
        if(index === -1){
            return Err("Event not found");
        }
        this.events.splice(index, 1);
        this.dump();
        return Ok(void 0);
    }
    
    dump(): void {
        const filePath = makePath(this.id);
        const dirPath = path.resolve(path.dirname(filePath));
    
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    
        fs.writeFileSync(path.resolve(filePath), JSON.stringify(this.toRUser(), null, 2), 'utf8');
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

    private unsafeLoad(): void{
        const filePath = makePath(this.id);
        const data = fs.readFileSync(filePath, 'utf8');
        const user: RUser = JSON.parse(data);
        const [timezone, err ]= TimeZone.fromString(user.timezone);
        if(err) throw new Error(err.message);
        this.timezone = timezone!;
        this.tags = user.tags;
        this.events = user.events.map(event => {
            const [ev, err] = CalendarService.fromJSON(event);
            if(err) throw new Error(err.message);
            return ev!;
        });
    }

    public getActiveEvents(): CalendarService[]{
        this.unsafeLoad();
        return this.events.filter(event => event.unixDiff(this.timezone) > 0);
    }

    public getNextEvent(): CalendarService | undefined{
        this.unsafeLoad();
        const events = this.getActiveEvents()
        if(events.length === 0) return undefined;
        return events[events.length - 1];
    }
    

    mention(): string{
        return `<@${this.id.value}>`;
    }
}