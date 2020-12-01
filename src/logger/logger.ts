import winston from 'winston';

export class Logger {
    private logger: any;

    constructor() {}

    public log (loggerservice: string) {
    this.logger = winston.createLogger({
        level: 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
    
        defaultMeta: { service: loggerservice },
        transports: [
          new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
          new winston.transports.File({ filename: 'logs/info.log', level: 'info' }),
    
        ],
      });
    
      if (process.env.NODE_ENV !== 'production') {
        this.logger.add(new winston.transports.Console({
          format: winston.format.simple(),
    
        }));
      }
      return this.logger;
    }
}