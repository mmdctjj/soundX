import { registerAs } from '@nestjs/config';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export default registerAs('jwt', () => {
  const envSecret = process.env.JWT_SECRET;
  if (envSecret) {
    return { secret: envSecret };
  }

  const secretFilePath = path.resolve(process.cwd(), '.jwt_secret');

  if (fs.existsSync(secretFilePath)) {
    const fileSecret = fs.readFileSync(secretFilePath, 'utf-8').trim();
    if (fileSecret) {
      return { secret: fileSecret };
    }
  }

  const newSecret = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(secretFilePath, newSecret);
  return { secret: newSecret };
});
