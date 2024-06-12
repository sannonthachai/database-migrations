import { Upload } from "@aws-sdk/lib-storage"
import { S3Client, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getMigrationFilenames, getFilesContent, writeStreamFile } from "./get-migration-file-name"
import "dotenv/config"

const client = new S3Client({ 
    region: "ap-southeast-1",
    credentials: {
        accessKeyId: `${process.env.ACCESS_KEY_ID}`,
        secretAccessKey: `${process.env.SECRET_ACCESS_KEY}`,
    }
})

export const uploadAllFileMigration = async (): Promise<void> => {
    const migrationFilesName = await getMigrationFilenames()
    migrationFilesName.forEach((fileName) => {
        new Upload({
            client,
            params: {
                Bucket: "database-migration-files",
                Key: fileName,
                Body: getFilesContent(fileName),
            },
        })
            .done()
            .then((data: any) => {
                console.log(`Upload File ${fileName} Success.`)
            })
            .catch((err: any) => {
                console.log(`Upload File ${fileName} Failed! : ${err}`)
            })
    })
}

export const uploadFileMigration = (fileName: string) => {
    new Upload({
        client,
        params: {
            Bucket: "database-migration-files",
            Key: fileName,
            Body: getFilesContent(fileName),
        },
    })
        .done()
        .then((data: any) => {
            console.log(`Upload File ${fileName} Success.`)
        })
        .catch((err: any) => {
            console.log(`Upload File ${fileName} Failed! : ${err}`)
        })
}

export const listAllFilesInBucket = async (): Promise<(string | undefined)[] | undefined> => {
    const listFileName = await client.send(new ListObjectsV2Command({ Bucket: "database-migration-files" }))
    return listFileName.Contents?.map(content => content.Key)
}

export const downloadFile = async (fileName: string) => {
    const response = await client.send(new GetObjectCommand({
        Bucket: "database-migration-files",
        Key: fileName,
    }))
    const data = await response.Body?.transformToByteArray()
    if (data) {
        await writeStreamFile(fileName, data)
    }
}

export const deleteFile = async (fileName: string) => {
    try {
        await client.send(new DeleteObjectCommand({
            Bucket: "database-migration-files",
            Key: fileName,
        }))
        console.log(`Delete file ${fileName} success`)
    } catch (err) {
        console.log(`Delete file ${fileName} failed`)
    }
}