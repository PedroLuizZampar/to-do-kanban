'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function main() {
	const DB_HOST = process.env.DB_HOST || 'localhost';
	const DB_USER = process.env.DB_USER || 'root';
	const DB_PASSWORD = process.env.DB_PASSWORD || '';
	const DB_PORT = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306;
	const DB_NAME = process.env.DB_NAME || 'kanban';

	// Conecta sem database para criar se necessário
	const connection = await mysql.createConnection({
		host: DB_HOST,
		user: DB_USER,
		password: DB_PASSWORD,
		port: DB_PORT,
		multipleStatements: true,
	});

	await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
	await connection.query(`USE \`${DB_NAME}\`;`);

	const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
	const altSchemaPath = path.join(__dirname, '..', '..', '..', 'database', 'schema.sql');
	const filePath = fs.existsSync(schemaPath) ? schemaPath : altSchemaPath;
	const sql = fs.readFileSync(filePath, 'utf8');
	await connection.query(sql);

	console.log('Banco e schema aplicados com sucesso.');
	await connection.end();
}

main().catch((err) => {
	console.error('Erro ao configurar o banco:', err);
	process.exit(1);
});
