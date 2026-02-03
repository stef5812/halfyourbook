import dotenv from "dotenv";
dotenv.config({ path: ".env" });

console.log("dotenv loaded:", Boolean(process.env.DATABASE_URL));
console.log("DATABASE_URL:", process.env.DATABASE_URL);
