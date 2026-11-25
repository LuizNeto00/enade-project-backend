import { join } from 'path';

function requiredDatabaseEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required database environment variable: ${name}`);
  }
  return value;
}

export function getDatabaseConfig() {
  return {
    type: 'mysql' as const,
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    username: requiredDatabaseEnvironment('DB_USER'),
    password: requiredDatabaseEnvironment('DB_PASSWORD'),
    database: requiredDatabaseEnvironment('DB_NAME'),
    timezone: 'Z' as const,
    entities: [join(__dirname, '..', '**/*.entity{.ts,.js}')],
    migrations: [join(__dirname, '..', 'migrations/*{.ts,.js}')],
    synchronize: false,
    logging: false,
  };
}
