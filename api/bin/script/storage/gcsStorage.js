"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gcsstorage = void 0;
const Cloud = require('@google-cloud/storage');
const { Storage: storageClient } = Cloud;
exports.gcsstorage = new storageClient({ projectId: process.env.GOOGLE_PROJECT_ID });
