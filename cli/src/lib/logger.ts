export default class Logger {
  static log(message: string, type?: "info" | "warn") {
    console.log(`${type ? `[${type.toUpperCase()}] ` : ""}${message}`);
  }

  static error(message: string) {
    console.error(`[ERROR] ${message}`);
  }
}