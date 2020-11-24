import * as dotenv from "dotenv";
import * as bodyParser from "body-parser";
import cors from "cors";
import express, { Application, Request, Response } from "express";
const puppeteer = require("puppeteer");
import { CronJob } from "cron";
import amqp from "amqplib/callback_api";
const app: Application = express();
dotenv.config();
const CONN_URL = "amqp://localhost";
let ch = null;
const q = "screenshot-messages";
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
  ch.assertQueue(q);
  ch.consume(q, async function (msg) {
    if (msg !== null) {
      console.log("hi", msg.content.toString());
      const payload = JSON.parse(msg.content.toString());
      const { uri, websiteName } = payload;
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.goto(`${uri}`);
      await page.screenshot({ path: `img/${websiteName}${+new Date()}.png` });

      await browser.close();
      ch.ack(msg);
    }
  });
});

job.start();

app.listen(process.env.PORT, () =>
  // logger.info(`server running on ${process.env.PORT}`)
  console.log(`server running on ${process.env.PORT}`)
);

export default app;
