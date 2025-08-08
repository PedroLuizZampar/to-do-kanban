const mysql = require('mysql2/promise');

const {
	DB_HOST = 'localhost',
	DB_USER = 'root',
	DB_PASSWORD = 'Jorge#80',
	DB_NAME = 'kanban',
	DB_PORT = 3306,
} = process.env;

let pool;

async function getPool() {
	if (!pool) {
		pool = mysql.createPool({
			host: DB_HOST,
			user: DB_USER,
			password: DB_PASSWORD,
			database: DB_NAME,
			port: DB_PORT,
			waitForConnections: true,
			connectionLimit: 10,
			queueLimit: 0,
			timezone: 'Z',
		});
	}
	return pool;
}

module.exports = { getPool };
