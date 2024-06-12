import fs from 'fs'
import path from 'path'
//joining path of directory 
const directoryPath = path.join(__dirname, 'migrations')

export const getLastMigrationFileName = () => {
    return new Promise<string>(function(resolve, reject) { 
        fs.readdir(directoryPath, function (err: any, files: any) {
            if (err) {
                reject(new Error(`Unable to scan directory! : ${err}`))
            }
            const lastFileMigration = files[files.length - 1]
            const timeStampMigration = lastFileMigration.split('-')[0]
            resolve(timeStampMigration)
        })
    })
}

export const getMigrationFilenames = () => {
    return new Promise<string[]>(function(resolve, reject) { 
        fs.readdir(directoryPath, function (err: any, files: any) {
            if (err) {
                reject(new Error(`Unable to scan directory! : ${err}`))
            }
            resolve(files)
        })
    })
}

export const getFilesContent = (fileName: string) => {
    return fs.readFileSync(path.join(directoryPath, fileName))
}

export const writeStreamFile = (fileName: string, data: Uint8Array) => {
    return new Promise<void>(function(resolve, reject) { 
        fs.writeFile(path.join(directoryPath, fileName), data, (err) => {
            if (err) {
                reject(new Error(`Write File Failed! : ${err}`))
            } else {
                console.log(`Write File ${fileName} Success.`)
                resolve()
            }
        })
    })
}

export const checkDirMigrations = () => {
    return fs.existsSync(directoryPath)
}