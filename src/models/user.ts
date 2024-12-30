import { CalendarEvent } from "./CalendarEvent";

export interface RUser{
    id: string;
    timezone: string;
    tags: string[];
    events: CalendarEvent[];
}

