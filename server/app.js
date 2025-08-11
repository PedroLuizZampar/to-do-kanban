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
const authRoutes = require('./routes/authRoutes');
const { auth } = require('./middleware/auth');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Static frontend
app.use('/', express.static(path.join(__dirname, '..', 'client')));

// API routes de autenticação (públicas)
app.use('/api/auth', authRoutes);

// API routes protegidas (exigem autenticação)
app.use('/api/categories', auth, categoryRoutes);
app.use('/api/tags', auth, tagRoutes);
app.use('/api/tasks', auth, taskRoutes);
app.use('/api/tasks/:taskId/subtasks', auth, subtaskRoutes);
app.use('/api/subtasks', auth, subtaskRoutes);
app.use('/api/boards', auth, boardRoutes);

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
