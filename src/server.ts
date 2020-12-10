import * as dotenv from "dotenv";
dotenv.config();
import * as bodyParser from "body-parser";
import { Logger } from "./logger/logger";
import cors from "cors";
import express, { Application, Request, Response } from "express";
import queueService from './helper/queueHelper';
import cacheService from './helper/cacheHelper';
import contentService from './helper/contentUploadHelper';
const puppeteer = require("puppeteer");
const app: Application = express();
const logging = new Logger();
const logger = logging.log("screenshot-job");

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
    const { data, message } = await queueService.getMessageFromQueue();
    if(!data) return res.status(400).send({message})
    let payload = JSON.parse(data.content.toString());
    let { uri, websiteName } = payload;
    const found = await cacheService.getData(websiteName);
    if(found.data) return res.status(200).send({message: found.message, data: {uri: found.data.uri, websiteName}})
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(`${uri}`, {
      timeout: 120000,
      waitUntil: "networkidle0",
    });
    const imgdir = `img/${websiteName}${+new Date()}.jpeg`;
    await page.screenshot({ path: `${imgdir}` });
    await page.waitForTimeout(5000);
    await browser.close();
    const contentSent =  await contentService.uploadFile(imgdir);
    await cacheService.addData(websiteName, {uri: contentSent.data, websiteName});
    return res.status(200).send({ message: `${websiteName} was uploaded successfully`, data: {websiteName, uri: contentSent.data}})
  } catch (error) {
    logger.error(`error occured ${JSON.stringify(error)}`);
    return res.status(500).send({ message: "Internal server error" });
  }
});

app.listen(process.env.PORT, () => {
  logger.info(`server running on ${process.env.PORT}`);
});

export default app;
