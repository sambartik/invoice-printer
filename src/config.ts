import dotenv from 'dotenv';
import path from 'path';

const envExtension = process.env.NODE_ENV ? `.${process.env.NODE_ENV}` : '';
const envPath = path.resolve(__dirname, `../.env${envExtension}`);
dotenv.config({path: envPath});

// @TODO: export config
