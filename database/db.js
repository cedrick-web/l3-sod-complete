const mysql = require("mysql2");

const db = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "l3_sod_project",
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
});

db.getConnection((error, connection) => {
    if (error) {
        console.error("Database connection failed:", error.message);
        return;
    }
    console.log("Database connected successfully");
    connection.release();
});

module.exports = db;
