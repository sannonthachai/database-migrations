import "reflect-metadata"
import "dotenv/config"
import { AppDataSource } from "./data-source"
import { DatabaseMigrations } from "./migration.entity"
import { getMigrationFilenames, checkDirMigrations } from "./get-migration-file-name"
import { uploadAllFileMigration, uploadFileMigration, listAllFilesInBucket, downloadFile } from "./s3"

const express = require('express')
const app = express()
const port = 3000

app.get('/Healthz', (req: any, res: any) => {
  res.send('OK')
})

app.listen(port, async () => {
    console.log(`App listening on port ${port}`)
    if (checkDirMigrations()) {
        try {
            await AppDataSource.initialize()
            
            const tableExists = (
                await AppDataSource.manager.query(
                    `SELECT * 
                    FROM information_schema.tables
                    WHERE table_schema = '${process.env.DB_NAME}' 
                        AND table_name = 'database_migrations'
                    LIMIT 1;`,
                )
            )

            if (!tableExists[0]) {
                await AppDataSource.runMigrations()
                console.log('Migration Success')
                await AppDataSource.destroy()
                await uploadAllFileMigration()
            } else {
                const migrationRepository = AppDataSource.getRepository(DatabaseMigrations)
                const migrations = await migrationRepository.find()
                const notExistMigrationFilenames = await getNotExistMigrationFilenames(migrations)
    
                if (notExistMigrationFilenames.length) {
                    await AppDataSource.runMigrations()
                    console.log('Migration Success')
                    notExistMigrationFilenames.forEach(fileName => {
                        if (fileName) {
                            uploadFileMigration(fileName)
                        }
                    })
                } else {
                    const migrationFilenamesS3 = await listAllFilesInBucket()
                    if (migrationFilenamesS3 && migrationFilenamesS3.length) {
                        const downloadFiles = await getRevertMigrationFilenames(migrations, migrationFilenamesS3)
    
                        if (downloadFiles.length) {
                            for (const fileName of downloadFiles) {
                                if (fileName) {
                                    await downloadFile(fileName)
                                }
                            }
                        }
                    
                        await AppDataSource.destroy()
                        await AppDataSource.initialize()
                    
                        for (let step = 0; step < downloadFiles.length; step++) {
                            await AppDataSource.undoLastMigration()
                            console.log(`Revert Migration ${step + 1}`)
                        }
                    }
                }
    
                await AppDataSource.destroy()
            }
        } catch (error) {
            console.log(`Process error : ${error}`)
            await AppDataSource.destroy()
        }
    }
})

const getNotExistMigrationFilenames = async (migrations: DatabaseMigrations[]) => {
    const migrationFilenames = await getMigrationFilenames()
    const unixTimestampsFromTableMigration = migrations.map(migration => `${migration.timestamp}`)

    const mapUnixTimestampsFromTableMigration = new Map<string, string>()
    unixTimestampsFromTableMigration.forEach(unixTimestamp => {
        mapUnixTimestampsFromTableMigration.set(unixTimestamp, unixTimestamp)
    })

    const notExistMigrationFilenames: string[] = [] 
    migrationFilenames.map(filename => {
        const unixTimestamp = filename.split('-')[0]
        const result = mapUnixTimestampsFromTableMigration.get(unixTimestamp)
        if (!result) {
            notExistMigrationFilenames.push(filename)
        }
    })
    return notExistMigrationFilenames
}

const getRevertMigrationFilenames = async (
    migrations: DatabaseMigrations[],
    migrationFilenamesS3: (string | undefined)[]
) => {
    const migrationFilenames = await getMigrationFilenames()

    const mapUnixTimestampsFromFiles = new Map<string, string>()
    migrationFilenames.forEach(filename => {
        const unixTimestamp = filename.split('-')[0]
        mapUnixTimestampsFromFiles.set(unixTimestamp, unixTimestamp)
    })

    const mapFilenamesS3 = new Map<string, string>()
    migrationFilenamesS3.forEach(filename => {
        if (filename) {
            const unixTimestamp = filename.split('-')[0]
            mapFilenamesS3.set(unixTimestamp, filename)
        }
    })

    const downloadFiles: string[] = []
    migrations.map(migration => {
        const result = mapUnixTimestampsFromFiles.get(`${migration.timestamp}`)
        if (!result) {
            const s3Filename = mapFilenamesS3.get(`${migration.timestamp}`)
            if (s3Filename) {
                downloadFiles.push(s3Filename)
            }
        }
    })
    return downloadFiles
}