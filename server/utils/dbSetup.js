'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function ensureDatabaseExists({ host, user, password, port, database, ssl }) {
	// Conecta no postgres padrão para criar o DB se necessário
	const client = new Client({ host, user, password, port, database: 'postgres', ssl });
	await client.connect();
	const existsRes = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [database]);
	if (existsRes.rowCount === 0) {
		await client.query(`CREATE DATABASE ${database}`);
	}
	await client.end();
}

async function main() {
	const DB_HOST = process.env.DB_HOST || 'localhost';
	const DB_USER = process.env.DB_USER || 'postgres';
	const DB_PASSWORD = process.env.DB_PASSWORD || '';
	const DB_PORT = process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432;
	const DB_NAME = process.env.DB_NAME || 'kanban';
	const DB_SSL = /^true$/i.test(process.env.DB_SSL || 'false') ? { rejectUnauthorized: false } : undefined;

	await ensureDatabaseExists({ host: DB_HOST, user: DB_USER, password: DB_PASSWORD, port: DB_PORT, database: DB_NAME, ssl: DB_SSL });

	const client = new Client({ host: DB_HOST, user: DB_USER, password: DB_PASSWORD, port: DB_PORT, database: DB_NAME, ssl: DB_SSL });
	await client.connect();

	const RESET = /^true$/i.test(process.env.DB_RESET || 'false');
	const baseA = path.join(__dirname, '..', '..', 'database');
	const baseB = path.join(__dirname, '..', '..', '..', 'database');
	const filename = RESET ? 'schema.postgres.sql' : 'migrations.postgres.sql';
	const fullA = path.join(baseA, filename);
	const fullB = path.join(baseB, filename);
	const chosen = fs.existsSync(fullA) ? fullA : fullB;
	const sql = fs.readFileSync(chosen, 'utf8');
	await client.query(sql);

	// Seed: cria usuário admin padrão se não existir
	const ures = await client.query('SELECT id FROM users WHERE username = $1 OR email = $2 LIMIT 1', ['admin', 'pedroluizzampar@gmail.com']);
	if (ures.rowCount === 0) {
		const adminPasswordPlain = 'Jorge#80';
		const hashed = await bcrypt.hash(adminPasswordPlain, 12);
		await client.query('INSERT INTO users (username, email, password, is_admin) VALUES ($1,$2,$3, true)', ['admin', 'pedroluizzampar@gmail.com', hashed]);
		console.log('Usuário admin criado: admin / pedroluizzampar@gmail.com');
	}

	console.log('Banco, schema e seed aplicados com sucesso.');
	await client.end();
}

main().catch((err) => {
	console.error('Erro ao configurar o banco:', err);
	process.exit(1);
});
