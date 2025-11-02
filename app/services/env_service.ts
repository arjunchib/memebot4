function ensure(name: string) {
  const value = Bun.env[name];
  if (value == null)
    throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export class EnvService {
  applicationId = ensure("APPLICATION_ID");
  token = ensure("TOKEN");
  seedBucket = ensure("SEED_BUCKET");
  s3AccessKeyId = ensure("S3_ACCESS_KEY_ID");
  s3SecretAccessKey = ensure("S3_SECRET_ACCESS_KEY");
  s3Endpoint = ensure("S3_ENDPOINT");
  s3Bucket = ensure("S3_BUCKET");
  guildId = ensure("GUILD_ID");
  channelId = ensure("CHANNEL_ID");
  adminId = ensure("ADMIN_ID");
}

export const env = new EnvService();
