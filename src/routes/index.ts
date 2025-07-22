import express from 'express';
import { check } from 'express-validator';
import config from '../config/index.js';
import {
  getAllServers,
  getAllSettings,
  createServer,
  updateServer,
  deleteServer,
  toggleServer,
  toggleTool,
  updateToolDescription,
  updateSystemConfig,
} from '../controllers/serverController.js';
import {
  getGroups,
  getGroup,
  createNewGroup,
  updateExistingGroup,
  deleteExistingGroup,
  addServerToExistingGroup,
  removeServerFromExistingGroup,
  getGroupServers,
  updateGroupServersBatch,
} from '../controllers/groupController.js';
import {
  getAllMarketServers,
  getMarketServer,
  getAllMarketCategories,
  getAllMarketTags,
  searchMarketServersByQuery,
  getMarketServersByCategory,
  getMarketServersByTag,
} from '../controllers/marketController.js';
import { login, register, getCurrentUser, changePassword } from '../controllers/authController.js';
import { getAllLogs, clearLogs, streamLogs } from '../controllers/logController.js';
import { getRuntimeConfig, getPublicConfig } from '../controllers/configController.js';
import { callTool } from '../controllers/toolController.js';
import { uploadDxtFile, uploadMiddleware } from '../controllers/dxtController.js';
import { auth, sessionAuth } from '../middlewares/auth.js';
import { 
  initiateGithubLogin, 
  handleGithubCallback, 
  logout, 
  getCurrentUser as getOAuthUser, 
  getUserKeys, 
  createUserKey, 
  updateKeyTokens, 
  extendKeyExpiry, 
  deactivateKey 
} from '../controllers/oauthController.js';
import {
  getAllUsers,
  updateUserAdminRole,
  updateUserStatus
} from '../controllers/adminController.js';

const router = express.Router();

export const initRoutes = (app: express.Application): void => {
  // API routes protected by auth middleware in middlewares/index.ts
  router.get('/servers', getAllServers);
  router.get('/settings', getAllSettings);
  router.post('/servers', createServer);
  router.put('/servers/:name', updateServer);
  router.delete('/servers/:name', deleteServer);
  router.post('/servers/:name/toggle', toggleServer);
  router.post('/servers/:serverName/tools/:toolName/toggle', toggleTool);
  router.put('/servers/:serverName/tools/:toolName/description', updateToolDescription);
  router.put('/system-config', updateSystemConfig);

  // Group management routes
  router.get('/groups', getGroups);
  router.get('/groups/:id', getGroup);
  router.post('/groups', createNewGroup);
  router.put('/groups/:id', updateExistingGroup);
  router.delete('/groups/:id', deleteExistingGroup);
  router.post('/groups/:id/servers', addServerToExistingGroup);
  router.delete('/groups/:id/servers/:serverName', removeServerFromExistingGroup);
  router.get('/groups/:id/servers', getGroupServers);
  // New route for batch updating servers in a group
  router.put('/groups/:id/servers/batch', updateGroupServersBatch);

  // Tool management routes
  router.post('/tools/call/:server', callTool);

  // DXT upload routes
  router.post('/dxt/upload', uploadMiddleware, uploadDxtFile);

  // Market routes
  router.get('/market/servers', getAllMarketServers);
  router.get('/market/servers/search', searchMarketServersByQuery);
  router.get('/market/servers/:name', getMarketServer);
  router.get('/market/categories', getAllMarketCategories);
  router.get('/market/categories/:category', getMarketServersByCategory);
  router.get('/market/tags', getAllMarketTags);
  router.get('/market/tags/:tag', getMarketServersByTag);

  // Log routes
  router.get('/logs', getAllLogs);
  router.delete('/logs', clearLogs);
  router.get('/logs/stream', streamLogs);

  // Auth routes - move to router instead of app directly
  router.post(
    '/auth/login',
    [
      check('username', 'Username is required').not().isEmpty(),
      check('password', 'Password is required').not().isEmpty(),
    ],
    login,
  );

  router.post(
    '/auth/register',
    [
      check('username', 'Username is required').not().isEmpty(),
      check('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
    ],
    register,
  );

  router.get('/auth/user', auth, getCurrentUser);

  // Add change password route
  router.post(
    '/auth/change-password',
    [
      auth,
      check('currentPassword', 'Current password is required').not().isEmpty(),
      check('newPassword', 'New password must be at least 6 characters').isLength({ min: 6 }),
    ],
    changePassword,
  );

  // GitHub OAuth routes
  router.get('/auth/github', initiateGithubLogin);
  router.get('/auth/github/callback', handleGithubCallback);
  router.post('/auth/logout', logout);
  
  // Key management routes (JWT 기반 인증)
  router.get('/keys', auth, getUserKeys);
  router.post('/keys', auth, createUserKey);
  router.put('/keys/:keyId/tokens', auth, updateKeyTokens);
  router.post('/keys/:keyId/extend', auth, extendKeyExpiry);
  router.post('/keys/:keyId/deactivate', auth, deactivateKey);

  // Admin routes (JWT 기반 인증 + 관리자 권한 필요)
  router.get('/admin/users', auth, getAllUsers);
  router.patch('/admin/users/:userId/admin', auth, updateUserAdminRole);
  router.patch('/admin/users/:userId/status', auth, updateUserStatus);

  // Runtime configuration endpoint (no auth required for frontend initialization)
  app.get(`${config.basePath}/config`, getRuntimeConfig);

  // Public configuration endpoint (no auth required to check skipAuth setting)
  app.get(`${config.basePath}/public-config`, getPublicConfig);

  // Health check endpoint (no auth required)
  app.get(`${config.basePath}/health`, (_req, res) => {
    res.status(200).json({
      success: true,
      message: 'MCPHub is running',
      timestamp: new Date().toISOString(),
    });
  });

  app.use(`${config.basePath}/api`, router);
};

export default router;
