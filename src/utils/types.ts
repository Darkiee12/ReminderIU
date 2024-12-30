export class PositiveBigInt {
    private constructor(public value: bigint) { }

    static fromString(value: string): Result<PositiveBigInt> {
        try {
            const parsed = BigInt(value);
            return parsed > 0 ? Ok(new PositiveBigInt(parsed)) : Err("Value must be positive");
        } catch {
            return Err("Invalid number format. Please provide a positive integer");
        }
    }
}
// UTC
export class TimeZone {
    private constructor(public value: string) { }
    static fromString(offset: string): Result<TimeZone> {
        if (offset.match(/^[+-]\d{2}:\d{2}$/)) {
            const [sign, hours, minutes] = offset.match(/([+-])(\d{2}):(\d{2})/)!.slice(1);
    
            const hourNum = parseInt(hours, 10);
            const minuteNum = parseInt(minutes, 10);
            if (
                (sign === "+" && hourNum >= 0 && hourNum <= 14 && !(hourNum === 14 && minuteNum > 0)) ||
                (sign === "-" && hourNum >= 0 && hourNum <= 12 && minuteNum >= 0)
            ) {
                return Ok(new TimeZone(offset));
            } else {
                return Err("Invalid timezone offset! Valid range is -12:00 to +14:00.");
            }
        } else {
            return Err("Invalid timezone format! Example: +05:30 | -05:00");
        }
    }
    

    offset(){
        const [sign, hours, minutes] = this.value.match(/([+-])(\d{2}):(\d{2})/)!.slice(1);
        return (parseInt(hours) * 60 + parseInt(minutes)) * 60 * 1000 * (sign === '+' ? 1 : -1);
    }

    toString(){
        return `UTC${this.value}`;
    }
}

export class i32{
    private constructor(public value: number){}
    static fromString(value: string): Result<i32>{
        try{
            const parsed = parseInt(value);
            return Number.isSafeInteger(parsed) ? Ok(new i32(parsed)) : Err("Value must be a 32-bit integer");
        }catch{
            return Err("Invalid number format. Please provide a 32-bit integer");
        }
    }
    static fromNumber(value: number): Result<i32>{
        return Number.isSafeInteger(value) ? Ok(new i32(value)) : Err("Value must be a 32-bit integer");
    }

    toString(): string{
        return this.value.toString();
    }

    equals(other: i32): boolean{
        return this.value === other.value;
    }
}

export class CalendarTitle{
    private static MAX_LENGTH = 256;
    private constructor(public value: string){}
    static fromString(value: string): Result<CalendarTitle>{
        if(value.length == 0){
            return Ok(new CalendarTitle("New untitled event"));
        } else if (value.length <= CalendarTitle.MAX_LENGTH){
            return Ok(new CalendarTitle(value));
        } else{
            return Err("Title must be less than 256 characters");
        }
    }
    toString(){
        return this.value;
    }
}

export class CalendarDate {
    private constructor(public value: string) {}

    static fromString(value: string): Result<CalendarDate> {
        if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = value.split("-").map(Number);
            if (
                year >= 1 &&
                month >= 1 && month <= 12 && 
                day >= 1 && day <= CalendarDate.daysInMonth(year, month)
            ) {
                return Ok(new CalendarDate(value));
            } else {
                return Err("Invalid date! Ensure the year, month, and day are valid.");
            }
        } else {
            return Err("Invalid date format! Example: 2024-12-31");
        }
    }

    toString() {
        return this.value;
    }

    
    private static daysInMonth(year: number, month: number): number {
        return new Date(year, month, 0).getDate(); 
    }
}


export class CalendarTime{
    private constructor(public value: string){}
    static fromString(value: string): Result<CalendarTime> {
        if (value.match(/^\d{2}:\d{2}$/)) {
            const [hours, minutes] = value.split(":").map(Number);
            if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
                return Ok(new CalendarTime(value));
            } else {
                return Err("Invalid time! Hours must be 0-23 and minutes must be 0-59.");
            }
        } else {
            return Err("Invalid time format! Example: 23:59");
        }
    }
    
    toString(){
        return this.value;
    }
}

export type Result<T> = [T, undefined] | [undefined, Error];

export const Ok = <T>(value: T): Result<T> => [value, undefined];
export const Err = (msg: string | Error): Result<never> => [undefined, msg instanceof Error ? msg : new Error(msg)];
export const isErr = <T>(result: Result<T>): result is Result<never> => result[1] !== undefined;
export const isOk = <T>(result: Result<T>): result is Result<T> => result[0] !== undefined;