const { Pool } = require('pg');

const {
	DB_HOST = 'localhost',
	DB_USER = 'postgres',
	DB_PASSWORD = '',
	DB_NAME = 'kanban',
	DB_PORT = 5432,
	DB_SSL = 'false',
} = process.env;

let pool;

async function getPool() {
	if (!pool) {
		pool = new Pool({
			host: DB_HOST,
			user: DB_USER,
			password: DB_PASSWORD,
			database: DB_NAME,
			port: Number(DB_PORT),
			ssl: /^true$/i.test(DB_SSL) ? { rejectUnauthorized: false } : undefined,
			max: 10,
			idleTimeoutMillis: 30000,
		});
	}
	return pool;
}

module.exports = { getPool };
