import expect from "expect.js";
import amqp from "amqplib";
import request from "supertest";
import app from "../../dist/server";

let ch;

describe("#POST Screenshot", function () {
  before(async function () {
    let payload = {
      websiteName: "stackoverflow",
      uri: "https://stackoverflow.com",
    };
    const queue = "screenshot-messages";
    const conn = await amqp.connect(process.env.BROKER_URL);
    ch = await conn.createChannel();
    await ch.sendToQueue(queue, Buffer.from(JSON.stringify(payload)));
    console.log("[x] Sent %s", payload);
  });

  it("Screenshot and upload a website", async function () {
    this.timeout(60000);
    const res = await request(app)
      .get("/api/screenshot/response")
      .set("Accept", "application/json")
      .expect(201);
    expect(res.body).have.property("message");
    expect(res.body).have.property("data");
    expect(res.body.data).have.property("uri");
    expect(res.body.data).have.property("websiteName");
  });
});
