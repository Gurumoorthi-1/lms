/**
 * Session Controller - Manage interview sessions
 */

const Session = require('../models/Session');
const { sessionStore } = require('./resumeController');
const { v4: uuidv4 } = require('uuid');

async function getSession(sessionId) {
  let session = await Session.findOne({ sessionId }).catch(() => null);
  if (!session) session = sessionStore.get(sessionId);
  return session;
}

/**
 * GET /api/session/:sessionId
 */
const getSession_ = async (req, res) => {
  try {
    const session = await getSession(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/session/create
 */
const createSession = async (req, res) => {
  try {
    const sessionId = uuidv4();
    const sessionData = { sessionId, status: 'active', proctoringEvents: [] };
    
    try {
      const session = new Session(sessionData);
      await session.save();
    } catch {
      sessionStore.set(sessionId, sessionData);
    }

    res.json({ success: true, sessionId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getSession: getSession_, createSession };
