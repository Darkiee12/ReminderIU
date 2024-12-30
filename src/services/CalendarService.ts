import { CalendarEvent } from "../models";
import { CalendarDate, CalendarTime, CalendarTitle, Err, i32, Ok, Result, TimeZone } from "../utils/types";

export default class CalendarService{
    private constructor(
        public id: i32,
        public title: CalendarTitle,
        public date: CalendarDate,
        public time: CalendarTime,
        public tags: string[],
        public description?: string,
        public location?: string,
    ){}

    public toCalendarEvent(): CalendarEvent{
        return {
            id: this.id.value,
            title: this.title.toString(),
            date: this.date.toString(),
            time: this.time.toString(),
            tags: this.tags,
            description: this.description,
            location: this.location
        }
    }

    static fromJSON(event: CalendarEvent): Result<CalendarService>{
        const [id, errId] = i32.fromNumber(event.id);
        if(errId){
            return Err(errId);
        }
        const [title, errTitle] = CalendarTitle.fromString(event.title);
        if(errTitle){
            return Err(errTitle);
        }
        const [date, errDate] = CalendarDate.fromString(event.date);
        if(errDate){
            return Err(errDate);
        }
        const [time, errTime] = CalendarTime.fromString(event.time);
        if(errTime){
            return Err(errTime);
        }
        return Ok(new CalendarService(id, title, date, time, event.tags, event.description, event.location));
    }

    isPast(tz: TimeZone): boolean {
        const dateTimeString = `${this.date.toString()}T${this.time.toString()}:00${tz.value}`;
        const future = new Date(dateTimeString).valueOf();
        return future <= Date.now();
    }


    unixDiff(offset: { value: string }): number {
        const dateTimeString = `${this.date.toString()}T${this.time.toString()}:00${offset.value}`;
        const future = new Date(dateTimeString).valueOf();
        return future - Date.now();
    }
}