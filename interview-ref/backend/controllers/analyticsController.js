/**
 * Analytics Controller - Final results, AI feedback, proctoring & emotion data
 * Extended for Feature 1 (object detection violations) + Feature 3 (emotion report)
 */

const { askClaude, parseJsonResponse } = require('../utils/claudeAI');
const Session = require('../models/Session');
const { sessionStore } = require('./resumeController');

async function getSession(sessionId) {
  let session = await Session.findOne({ sessionId }).catch(() => null);
  if (!session) session = sessionStore.get(sessionId);
  return session;
}

async function saveSession(session) {
  if (session.save) {
    await session.save().catch(() => sessionStore.set(session.sessionId, session));
  } else {
    sessionStore.set(session.sessionId, session);
  }
}

/**
 * GET /api/analytics/:sessionId
 */
const getAnalytics = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await getSession(sessionId);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    const round1Score = session.aptitude?.passed
      ? Math.round((session.aptitude.score / session.aptitude.maxScore) * 100) : 0;
    const round2Score = session.coding?.passed
      ? Math.round((session.coding.score / 5) * 100) : 0;
    const round3Score = session.interview?.overallScore
      ? Math.round((session.interview.overallScore / 10) * 100) : 0;

    const overallScore = Math.round((round1Score + round2Score + round3Score) / 3);
    const overallPassed = session.aptitude?.passed && session.coding?.passed && session.interview?.passed;

    // Count proctoring violations by type (Feature 1 object detection violations included)
    const violations = session.proctoringEvents || [];
    const violationSummary = {};
    violations.forEach(v => {
      violationSummary[v.eventType || v.type] = (violationSummary[v.eventType || v.type] || 0) + 1;
    });
    const criticalViolations = violations.filter(v => v.severity === 'critical').length;

    const feedbackPrompt = `Generate comprehensive interview feedback for this candidate. Return ONLY valid JSON.

Resume ATS Score: ${session.resume?.atsScore || 70}
Round 1 (Aptitude): ${round1Score}% - ${session.aptitude?.passed ? 'PASSED' : 'FAILED'}
Round 2 (Coding): ${round2Score}% - ${session.coding?.passed ? 'PASSED' : 'FAILED'}
Round 3 (Interview): ${round3Score}% - ${session.interview?.passed ? 'PASSED' : 'FAILED'}
Overall: ${overallScore}% - ${overallPassed ? 'SELECTED' : 'NOT SELECTED'}
Skills: ${(session.resume?.skills || []).join(', ')}
Proctoring violations: ${criticalViolations} critical events

Return JSON:
{
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2"],
  "improvements": ["improvement1", "improvement2", "improvement3"],
  "skillGaps": ["gap1", "gap2"],
  "aiFeedback": "detailed 3-4 sentence personalized feedback paragraph",
  "recommendedResources": ["resource1", "resource2"],
  "nextSteps": ["step1", "step2", "step3"]
}`;

    let feedback;
    try {
      const aiResponse = await askClaude(feedbackPrompt, 'You are an expert career counselor. Return only valid JSON.', 1500);
      feedback = parseJsonResponse(aiResponse);
    } catch (e) {
      feedback = generateFallbackFeedback(round1Score, round2Score, round3Score, overallPassed);
    }

    const analytics = {
      overallScore,
      overallPassed,
      roundScores: { round1: round1Score, round2: round2Score, round3: round3Score },
      ...feedback,
      generatedAt: new Date(),
    };

    session.analytics = analytics;
    await saveSession(session);

    res.json({
      success: true,
      sessionId,
      analytics,
      roundDetails: {
        round1: { score: round1Score, passed: session.aptitude?.passed || false, totalQuestions: session.aptitude?.totalQuestions || 0, correctAnswers: session.aptitude?.score || 0 },
        round2: { score: round2Score, passed: session.coding?.passed || false, problemsSolved: session.coding?.score || 0, totalProblems: 5, detectedLanguage: session.coding?.detectedLanguage || 'javascript' },
        round3: { score: round3Score, passed: session.interview?.passed || false, avgScore: session.interview?.overallScore || 0 },
      },
      resume: { atsScore: session.resume?.atsScore || 70, skills: session.resume?.skills || [] },
      // Feature 1: violation summary
      proctoring: {
        totalEvents: violations.length,
        criticalViolations,
        violationSummary,
        hasObjectDetectionViolations: !!(violationSummary.phone || violationSummary.multi_person || violationSummary.book),
        emotionReport: session.emotionReport || null,
      },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/analytics/proctoring-event
 * Log a proctoring event (Features 1 + existing)
 */
const logProctoringEvent = async (req, res) => {
  try {
    const { sessionId, type, message, severity, round } = req.body;
    const session = await getSession(sessionId);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    if (!session.proctoringEvents) session.proctoringEvents = [];
    session.proctoringEvents.push({
      eventType: type,
      message,
      severity: severity || 'warning',
      timestamp: new Date(),
      round: round || 'unknown',
    });

    await saveSession(session);
    res.json({ success: true });
  } catch (error) {
    console.error('Log proctoring event error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/analytics/emotion-report
 * Feature 3: Save emotion analysis report at end of HR interview
 */
const saveEmotionReport = async (req, res) => {
  try {
    const { sessionId, report } = req.body;
    const session = await getSession(sessionId);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    session.emotionReport = {
      ...report,
      savedAt: new Date(),
    };

    await saveSession(session);
    res.json({ success: true, message: 'Emotion report saved' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

function generateFallbackFeedback(r1, r2, r3, passed) {
  const avg = Math.round((r1 + r2 + r3) / 3);
  return {
    strengths: [
      avg > 60 ? 'Strong overall performance' : 'Shows potential in key areas',
      r1 > 50 ? 'Good aptitude and reasoning skills' : 'Foundational knowledge present',
      r2 > 50 ? 'Demonstrated coding competency' : 'Problem-solving approach is on track',
    ],
    weaknesses: [
      r1 < 50 ? 'Aptitude score needs improvement' : 'Could improve speed under pressure',
      r2 < 60 ? 'Coding skills require more practice' : 'Complex algorithmic thinking can improve',
    ],
    improvements: [
      'Practice daily coding challenges on LeetCode and HackerRank',
      'Review data structures and algorithms fundamentals',
      'Work on communication skills for technical explanations',
      'Build projects to demonstrate practical knowledge',
    ],
    skillGaps: ['System design concepts', 'Advanced data structures', 'Cloud technologies'],
    aiFeedback: passed
      ? `Congratulations on clearing all rounds! Your performance indicates readiness for a professional role (${avg}% overall). Continue building on your strengths and address identified skill gaps.`
      : `Thank you for participating. With an overall score of ${avg}%, focus on strengthening problem-solving skills through regular practice, and work on structured, example-driven responses in behavioral interviews.`,
    recommendedResources: ['LeetCode for coding practice', 'System Design Primer (GitHub)', 'Cracking the Coding Interview'],
    nextSteps: ['Practice 2-3 LeetCode problems daily', 'Review weak aptitude areas', 'Mock interview sessions with peers', 'Update resume with measurable achievements'],
  };
}

module.exports = { getAnalytics, logProctoringEvent, saveEmotionReport };
