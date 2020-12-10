import amqp from "amqplib";
import { Logger } from "../logger/logger";
const logging = new Logger();
const logger = logging.log("screenshot-job-get-message");
let ch: {
  assertQueue(queue: string): void;
  consume(queue: string, callback: Function);
  ack(acknowledgement);
  sendToQueue(queueName, payload, {});
  prefetch(param: number);
  close();
};
const queue = "screenshot-messages";


class QueueService {
  conn;

  constructor() {
    this.connnection();
  }

  async connnection (){
    try {
      this.conn = await amqp.connect(process.env.BROKER_URL);
      ch = await this.conn.createChannel();
      logger.info(`queue connection established`);
    } catch (error) {
      logger.error(`Something is wrong with queue connection`);
    }
  }

  async getMessageFromQueue() {
    try {
      let data;
      await ch.assertQueue(queue);
      await ch.prefetch(1);
      await ch.consume(queue, msg => {
        if (msg !== null) {
          logger.info(JSON.stringify(JSON.parse(msg.content.toString())));
          ch.ack(msg)
          data = msg;
        } else {
          data = null
        }
      });
      if(!data) return {message: 'No data in the queue', data}
      return { message: 'message received', data}
    } catch (error) {
      await ch.close()
      await this.conn.close()
      logger.error(`something is wrong with the broker service 'get message'`);
      return  {message: 'something is wrong with the broker service', data: null}
    }
  }
}

const queueService = new QueueService();
export default queueService;