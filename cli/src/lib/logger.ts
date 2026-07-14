export default class Logger {
  static log(message: string, type?: "info" | "warn" | "debug") {
    if(type === "debug" && process.env.DEBUG !== "true") return;
    console.log(`${type ? `[${type.toUpperCase()}] ` : ""}${message}`);
  }

  static error(message: string) {
    console.error(`[ERROR] ${message}`);
  }
}
