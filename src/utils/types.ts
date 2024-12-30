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
            return Ok(new TimeZone(offset));
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

    toString(){
        return this.value.toString();
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

export class CalendarDate{
    private constructor(public value: string){}
    static fromString(value: string): Result<CalendarDate>{
        if(value.match(/^\d{4}-\d{2}-\d{2}$/)){
            return Ok(new CalendarDate(value));
        } else{
            return Err("Invalid date format! Example: 2024-12-31");
        }
    }
    toString(){
        return this.value;
    }
}

export class CalendarTime{
    private constructor(public value: string){}
    static fromString(value: string): Result<CalendarTime>{
        if(value.match(/^\d{2}:\d{2}$/)){
            return Ok(new CalendarTime(value));
        } else{
            return Err("Invalid time format! Example: 23:59");
        }
    }
    toString(){
        return this.value;
    }
}

export namespace Option {
    export type Option<T> = { kind: "Some"; value: T } | { kind: "None" };

    export function Some<T>(value: T): Option<T> {
        return { kind: "Some", value };
    }

    export function None<T>(): Option<T> {
        return { kind: "None" };
    }

    export function isSome<T>(opt: Option<T>): boolean {
        return opt.kind === "Some";
    }

    export function isNone<T>(opt: Option<T>): boolean {
        return opt.kind === "None";
    }
}

export type Result<T> = [T, undefined] | [undefined, Error];

export const Ok = <T>(value: T): Result<T> => [value, undefined];
export const Err = (msg: string | Error): Result<never> => [undefined, msg instanceof Error ? msg : new Error(msg)];