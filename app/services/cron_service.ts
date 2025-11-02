export class CronService {
  static #shared: CronService;

  static get shared() {
    return (this.#shared ||= new CronService());
  }

  SCHEDULED_AT = new Date();

  setup() {
    setTimeout();
  }
}
