const Cloud = require('@google-cloud/storage')

const { Storage: storageClient } = Cloud

export const gcsstorage = new storageClient({ projectId: process.env.GOOGLE_PROJECT_ID })

