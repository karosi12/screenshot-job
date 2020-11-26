import * as dotenv from "dotenv";
dotenv.config();
import * as bodyParser from "body-parser";
import { Logger } from "../logger/logger";
import cors from "cors";
import axios from "axios";
import express, { Application, Request, Response } from "express";
const puppeteer = require("puppeteer");
import { CronJob } from "cron";
import amqp from "amqplib/callback_api";
const app: Application = express();
const fs = require("fs");
const { promisify } = require("util");
const readFileAsync = promisify(fs.readFile);
const unlinkAsync = promisify(fs.unlink);
const logging = new Logger();
const logger = logging.log("server");
const AWS = require("aws-sdk");
const spaceEndpoint = new AWS.Endpoint(process.env.SPACE_ENDPOINT);
const s3 = new AWS.S3({
  endpoint: spaceEndpoint,
  accessKeyId: process.env.ACCESS_KEYID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
});
const CONN_URL = "amqp://localhost";
let ch: {
  assertQueue(queue: string, {}): void;
  consume(queue: string, callback: Function);
  ack(acknowledgement);
  sendToQueue(queueName, payload, {});
};
const queue = "screenshot-messages";
amqp.connect(CONN_URL, function (err, conn) {
  conn.createChannel(function (err, channel) {
    ch = channel;
  });
});
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(cors());

app.get("/", (req: Request, res: Response) => {
  return res.status(200).send({ message: "API is running fine" });
});

const job = new CronJob("* * * * * *", function () {
  ch.consume(queue, async function (msg) {
    if (msg !== null) {
      const payload = JSON.parse(msg.content.toString());

      const { uri, websiteName } = payload;
      const browser = await puppeteer.launch({ headless: true });
      try {
        const page = await browser.newPage();
        await page.goto(`${uri}`, {
          timeout: 120000,
          waitUntil: "networkidle0",
        });
        const imgdir = `${websiteName}${+new Date()}.jpeg`;
        await page.screenshot({
          path: `img/${imgdir}`,
        });
        const uploadPayload = { imguri: imgdir };
        const uploadUri = process.env.UPLOAD_URI;
        await axios.post(uploadUri, uploadPayload);
        await ch.ack(msg);
      } catch (error) {
        await browser.close();
      }
    }
  });
});

job.start();

app.post("/api/upload", async (req, res) => {
  const { imguri } = req.body;
  const queue = "recieve-screenshot";
  try {
    if (imguri) {
      const content = await readFileAsync(`img/${imguri}`);
      if (!content) {
        logger.error(`unable to upload file`);
        return res
          .status(400)
          .send({ message: "unable to upload file", data: null });
      } else {
        const fileContent = await content;
        const params = {
          Bucket: process.env.BUCKET,
          Key: `${imguri}`,
          Body: fileContent,
          ACL: "public-read",
        };
        const response = await s3.upload(params).promise();
        await unlinkAsync(`img/${imguri}`);
        if (!response) {
          logger.error(`unable to save file ${imguri}`);
          return res.status(400).send({
            message: `unable to save file ${imguri}`,
            data: null,
          });
        }
        const responsePayload = { uri: response.Location };
        logger.info(JSON.stringify(responsePayload));
        const payload = JSON.stringify(responsePayload);
        ch.assertQueue(queue, { durable: true });
        ch.sendToQueue(queue, Buffer.from(payload), { persistent: true }); // No data lost
        logger.info(`website image was uploaded successfully`);
        return res.status(200).send({
          message: `website image was uploaded successfully`,
          data: `${response.Location}`,
        });
      }
    } else {
      logger.error(`No file found, try upload again`);
      return res
        .status(400)
        .send({ message: "No file found, try upload again", data: null });
    }
  } catch (error) {
    logger.error(`error occured ${JSON.stringify(error)}`);
    return res.status(500).send({ message: "Internal server error" });
  }
});

app.listen(process.env.PORT, () => {
  logger.info(`server running on ${process.env.PORT}`);
});

export default app;
