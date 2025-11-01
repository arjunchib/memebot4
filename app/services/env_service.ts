function ensure(name: string) {
  const value = Bun.env[name];
  if (value == null)
    throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export class EnvService {
  APPLICATION_ID = ensure("APPLICATION_ID");
  TOKEN = ensure("TOKEN");
  SEED_BUCKET = ensure("SEED_BUCKET");
  S3_ACCESS_KEY_ID = ensure("S3_ACCESS_KEY_ID");
  S3_SECRET_ACCESS_KEY = ensure("S3_SECRET_ACCESS_KEY");
  S3_ENDPOINT = ensure("S3_ENDPOINT");
  S3_BUCKET = ensure("S3_BUCKET");
  GUILD_ID = ensure("GUILD_ID");
  CHANNEL_ID = ensure("CHANNEL_ID");
  ADMIN_ID = ensure("ADMIN_ID");
}

export const env = new EnvService();
