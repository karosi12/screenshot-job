import * as dotenv from "dotenv";
dotenv.config();
import * as bodyParser from "body-parser";
import { Logger } from "../logger/logger";
import cors from "cors";
import axios from "axios";
import express, { Application, Request, Response } from "express";
const puppeteer = require("puppeteer");
import { CronJob } from "cron";
import redis from "redis";

import amqp from "amqplib/callback_api";
const app: Application = express();
const fs = require("fs");
const { promisify } = require("util");
const readFileAsync = promisify(fs.readFile);
const unlinkAsync = promisify(fs.unlink);
const logging = new Logger();
const logger = logging.log("server");
const AWS = require("aws-sdk");
const client = redis.createClient();
client.on("error", function (error) {
  console.error(error);
});
const spaceEndpoint = new AWS.Endpoint(process.env.SPACE_ENDPOINT);
const s3 = new AWS.S3({
  endpoint: spaceEndpoint,
  accessKeyId: process.env.ACCESS_KEYID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
});
const CONN_URL = "amqp://localhost";
let ch: {
  assertQueue(queue: string): void;
  consume(queue: string, callback: Function);
  ack(acknowledgement);
  sendToQueue(queueName, payload, {});
  prefetch(param: number);
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

app.get("/api/screenshot/response", async (req, res) => {
  try {
    ch.assertQueue(queue);
    ch.prefetch(1);
    ch.consume(queue, async function (msg) {
      logger.info(JSON.stringify(JSON.parse(msg.content.toString())));
      if (msg !== null) {
        let payload = JSON.parse(msg.content.toString());
        let { uri, websiteName } = payload;
        // Typescript does not support Bluebird promisifyAll so I have to use callback.
        client.exists(websiteName, async (err, found) => {
          if (err)
            return res
              .status(400)
              .send({ message: "something is wrong with caching" });
          if (found === 1) {
            client.get(websiteName, (err, value) => {
              if (err) throw new Error(err);
              ch.ack(msg);
              return res
                .status(200)
                .send({ message: "data found", data: JSON.parse(value) });
            });
          } else {
            logger.info("not found =>", found);
            const browser = await puppeteer.launch({ headless: true });
            const page = await browser.newPage();
            await page.goto(`${uri}`, {
              timeout: 120000,
              waitUntil: "networkidle0",
            });
            const imgdir = `img/${websiteName}${+new Date()}.jpeg`;
            await page.screenshot({ path: `${imgdir}` });
            await browser.close();
            if (imgdir) {
              const content = await readFileAsync(`${imgdir}`)
              if (!content) {
                logger.error(`unable to upload file`);
                return res
                  .status(400)
                  .send({ message: "unable to upload file", data: null });
              } else {
                const fileContent = await content;
                const params = {
                  Bucket: process.env.BUCKET,
                  Key: `${imgdir}`,
                  Body: fileContent,
                  ACL: "public-read",
                };
                const response = await s3.upload(params).promise();
                await unlinkAsync(`${imgdir}`);
                if (!response) {
                  logger.error(`unable to save file ${imgdir}`);
                  return res.status(400).send({
                    message: `unable to save file ${imgdir}`,
                    data: null,
                  });
                }
                const responsePayload = { uri: response.Location };
                logger.info(JSON.stringify(responsePayload));
                logger.info(`website image was uploaded successfully`);
                uri = response.Location;
                payload = { websiteName, uri };
                client.set(websiteName, JSON.stringify(payload), redis.print);
                client.get(websiteName, (err, value) => {
                  if (err) throw new Error(err);
                  ch.ack(msg);
                  return res
                    .status(200)
                    .send({ message: "data created", data: JSON.parse(value) });
                });
              }
            } else {
              logger.error(`No file found, try upload again`);
              return res.status(400).send({
                message: "No file found, try upload again",
                data: null,
              });
            }
          }
        });
      }
    });
  } catch (error) {
    logger.error(`error occured ${JSON.stringify(error)}`);
    return res.status(500).send({ message: "Internal server error" });
  }
});

app.listen(process.env.PORT, () => {
  logger.info(`server running on ${process.env.PORT}`);
});

export default app;
