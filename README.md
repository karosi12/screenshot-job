# Webpage screenshot cron job

A background job that handle webpage screenshot and save it to digital ocean space

# Technologies Used

- Backend: Node/Express
- typescript
- aws-sdk
- puppeteer
- amqplib(Rabbitmq)
- Libaries: Es6, Babel, eslint, cron-job, supertest, express

##

File storage is digitalocean space

# Digital ocean space credential

- ACCESS_KEYID=
- SECRET_ACCESS_KEY=
- SPACE_ENDPOINT=
- BUCKET=

# env sample

- PORT=3300
- NODE_ENV=
- ACCESS_KEYID=
- SECRET_ACCESS_KEY=
- SPACE_ENDPOINT=
- BUCKET=
- UPLOAD_URI={baseuri}/api/upload

# To Install

- Download or clone
- Open terminal inside the root directory of clone folder
- Type `npm install` to install all dependencies
- `npm start` to run the app
- `npm run dev` to run development environment

## AUTHOR

[Kayode Adeyemi](https://github.com/karosi12)
