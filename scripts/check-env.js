process.loadEnvFile(".env.local");
console.log("MONGODB_URI set:", Boolean(process.env.MONGODB_URI));
console.log("cwd:", process.cwd());
