const { getPool } = require('../config/database');

async function query(sql, params) {
	const pool = await getPool();
	const [rows] = await pool.execute(sql, params);
	return rows;
}

module.exports = { query };
