'use strict';

const path = require('path');
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
require('dotenv').config();

const categoryRoutes = require('./routes/categoryRoutes');
const tagRoutes = require('./routes/tagRoutes');
const taskRoutes = require('./routes/taskRoutes');
const boardRoutes = require('./routes/boardRoutes');
const subtaskRoutes = require('./routes/subtaskRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Static frontend
app.use('/', express.static(path.join(__dirname, '..', 'client')));

// API routes
app.use('/api/categories', categoryRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/tasks/:taskId/subtasks', subtaskRoutes);
app.use('/api/subtasks', subtaskRoutes);
app.use('/api/boards', boardRoutes);

// Health
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
	console.error('Unhandled error:', err); // keep simple
	res.status(err.status || 500).json({ error: err.message || 'Erro interno' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Servidor rodando em http://localhost:${PORT}`);
});

module.exports = app;
