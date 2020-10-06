
export enum LogLevel {
  INFO,
  ERROR,
  DEBUG,
  WARN,
  ALL
}

export function log(messageLevel:LogLevel, message:string): void;   
export function log(messageLevel:LogLevel, object1:any, object2?:any, object3?:any): void;   

export function log(messageLevel:LogLevel, messageOrObject:string | any, param2?:any, param3?:any ) {
  if (messageLevel > CONFIG.logLevel)
    return;

  if (param3) {
    console.log('blood-n-guts | ', messageOrObject, param2, param3);      
  }
  else if (param2) {
    console.log('blood-n-guts | ', messageOrObject, param2);      
  }
  else
    console.log(`blood-n-guts | ${messageOrObject}`);
    
}


