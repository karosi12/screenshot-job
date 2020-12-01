import expect from "expect.js";
import request from "supertest";
import app from "../../dist/server";

describe("server is running 🚀", () => {
  it("should give the welcome address", async () => {
    try {
      const res = await request(app).get("/").expect(200);
      expect(res.status).equal(200);
      console.log(res.body);
      expect(res.body).have.property("message");
      expect(res.body.message).equal("API is running fine");
    } catch (error) {
      throw new Error(error);
    }
  });
});
