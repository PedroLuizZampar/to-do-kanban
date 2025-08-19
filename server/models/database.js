const { getPool } = require('../config/database');

function replacePlaceholders(sql) {
	let i = 0;
	return sql.replace(/\?/g, () => `$${++i}`);
}

function isInsert(sql) {
	return /^\s*insert\s+/i.test(sql);
}

function shouldAutoReturnId(sql) {
	const m = /^\s*insert\s+into\s+([a-zA-Z0-9_]+)/i.exec(sql);
	if (!m) return false;
	const table = m[1].toLowerCase();
	// Tabelas sem coluna 'id'
	const noId = new Set(['task_assignees', 'task_tags', 'board_members']);
	return !noId.has(table);
}

async function query(sql, params = []) {
	const pool = await getPool();
	const text = replacePlaceholders(sql);
	if (isInsert(text) && shouldAutoReturnId(text) && !/returning\s+\w+/i.test(text)) {
		const returningText = `${text} RETURNING id`;
		const res = await pool.query(returningText, params);
		const id = res.rows?.[0]?.id ?? null;
		return { insertId: id };
	}
	const res = await pool.query(text, params);
	return res.rows;
}

async function queryOne(sql, params = []) {
	const rows = await query(sql, params);
	if (Array.isArray(rows)) return rows[0] || null;
	return rows; // For non-selects, just return whatever
}

module.exports = { query, queryOne };
