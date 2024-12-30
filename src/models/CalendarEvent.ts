export interface CalendarEvent{
    id: number;
    title: string;
    description?: string;
    date: string;
    time: string;
    location?: string;
    tags: string[];
}