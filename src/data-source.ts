import { DataSource } from "typeorm"
import { DatabaseMigrations } from "./migration.entity"
import "dotenv/config"

export const AppDataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? +process.env.DB_PORT : 3306,
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    timezone: '+07:00',
    migrationsTableName: 'database_migrations',
    migrations: ['build/migrations/*.js'],
    entities: [DatabaseMigrations],
})