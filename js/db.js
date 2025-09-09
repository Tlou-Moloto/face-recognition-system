// backend/db.js
const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",              // <-- replace with your PostgreSQL username
  host: "localhost",
  database: "face_recognition",  // <-- make sure this DB exists in pgAdmin
  password: "141412",     // <-- replace with your PostgreSQL password
  port: 5432,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
