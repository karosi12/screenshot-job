import asyncRedis from "async-redis";
import { Logger } from "../logger/logger";
const logging = new Logger();
const logger = logging.log("screenshot-job-cache");
const client = asyncRedis.createClient();

class CacheService {
  constructor() {
    this.connection();
  }

  connection (){
    client.on("error", function (error) {
      console.error(error);
      logger.error(`${error}`)
    });
  }

  async addData(websiteName, payload) {
    const response = await client.set(websiteName, JSON.stringify(payload)); 
    return response
  }

  async getData(key) {
    try {
      let data = await client.get(key)
      data = JSON.parse(data)
      return { message: "data found", data }
    } catch (error) {
      logger.error(`something is wrong while getting data from cache`);
      return  { message: 'something is wrong while getting data from cache', data: null }
    }
  }
}

const cache = new CacheService();
export default cache;