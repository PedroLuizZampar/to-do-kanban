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
const attachmentRoutes = require('./routes/attachmentRoutes');
const templateRoutes = require('./routes/templateRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const profileRoutes = require('./routes/profileRoutes');
const { auth } = require('./middleware/auth');
const profileController = require('./controllers/profileController');
const attachmentController = require('./controllers/attachmentController');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Static frontend
app.use('/', express.static(path.join(__dirname, '..', 'client')));
// Static uploads
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API routes de autenticação (públicas)
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/profile', profileRoutes);
// Rota pública para servir avatar por ID (usada em cards/listas)
app.get('/api/users/:id/avatar', profileController.getAvatarByUserId);
// Rota pública para visualizar/download de anexos de tarefas (para <img src=...>)
app.get('/api/attachments/:attachmentId', attachmentController.download);

// API routes protegidas (exigem autenticação)
app.use('/api/categories', auth, categoryRoutes);
app.use('/api/tags', auth, tagRoutes);
app.use('/api/tasks', auth, taskRoutes);
app.use('/api/tasks/:taskId/subtasks', auth, subtaskRoutes);
app.use('/api/tasks/:taskId/attachments', auth, attachmentRoutes);
app.use('/api/subtasks', auth, subtaskRoutes);
app.use('/api/boards', auth, boardRoutes);
app.use('/api/templates', auth, templateRoutes);

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
