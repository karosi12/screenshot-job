const fs = require("fs");
const { promisify } = require("util");
const readFileAsync = promisify(fs.readFile);
const unlinkAsync = promisify(fs.unlink);
const AWS = require("aws-sdk");
const spaceEndpoint = new AWS.Endpoint(process.env.SPACE_ENDPOINT);
const s3 = new AWS.S3({
  endpoint: spaceEndpoint,
  accessKeyId: process.env.ACCESS_KEYID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
});

class ContentUploadService {
  constructor() {}
  async uploadFile(imgdir) {
    if (imgdir) {
      const content = await readFileAsync(`${imgdir}`);
      if (!content) {
        return { message: "unable to upload file", data: null };
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
          return {
            message: `unable to save file ${imgdir}`,
            data: null,
          };
        }
        return {
          message: `${imgdir} was uploaded successfully`,
          data: `${response.Location}`,
        };
      }
    } else {
      return { message: "No file found, try upload again", data: null };
    }
  }
}

const contentUpload = new ContentUploadService();
export default contentUpload;