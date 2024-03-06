import http from "http";
import data from "./data.js";
// Import the `config` function from the `dotenv` package
import { config } from 'dotenv';
// Load environment variables from the .env file
config();
const port = process.env.PORT || 3000;
const server = http.createServer(data);

console.log(`Server running at http://localhost:${port}`);
console.log("try /api/dictionary/english/hello");
console.log("or use / to test the api with UI");

server.listen(port);
