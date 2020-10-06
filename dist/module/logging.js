export var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["INFO"] = 0] = "INFO";
    LogLevel[LogLevel["ERROR"] = 1] = "ERROR";
    LogLevel[LogLevel["DEBUG"] = 2] = "DEBUG";
    LogLevel[LogLevel["WARN"] = 3] = "WARN";
    LogLevel[LogLevel["ALL"] = 4] = "ALL";
})(LogLevel || (LogLevel = {}));
export function log(messageLevel, messageOrObject, param2, param3) {
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
