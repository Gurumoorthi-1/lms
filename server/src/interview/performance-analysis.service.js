import { Types, Model } from 'mongoose';

import jwt from 'jsonwebtoken';
import { User } from '../auth/user.schema.js';
import { Progress, AssessmentStage, ProgressStatus } from '../progress/progress.schema.js';
import { Submission } from '../problems/submission.schema.js';
import { Problem } from '../problems/problem.schema.js';
import { Exam } from '../exams/exam.schema.js';
import { Topic } from '../courses/topic.schema.js';
import { Course } from '../courses/course.schema.js';
import { PerformanceAnalysis } from '../interview/performance-analysis.schema.js';

import { AiService } from '../ai/ai.service.js';

export class PerformanceAnalysisService {
  constructor() {
    this.aiService = new AiService();
  }

  async upsert(userId, data) {
    return PerformanceAnalysis.findOneAndUpdate(
      { user: new Types.ObjectId(userId) },
      { $set: data },
      { upsert: true, new: true }
    );
  }

  async recordMcqPerformance(userId, data) {
    return this.upsert(userId, {
      mcq: { ...data, completedAt: new Date() }
    });
  }

  async recordResumeAnalysis(userId, data) {
    return this.upsert(userId, {
      resume: { ...data, analyzedAt: new Date() }
    });
  }

  async recordAptitudePerformance(userId, data) {
    return this.upsert(userId, {
      aptitude: { ...data, completedAt: new Date() }
    });
  }

  async recordCodingPerformance(userId, data) {
    const current = await PerformanceAnalysis.findOne({ user: new Types.ObjectId(userId) }).lean();
    const prevMarks = current?.coding?.marksObtained || 0;
    const newMarks = data.marksObtained !== undefined ? data.marksObtained : prevMarks + (data.taskMarks || 0);
    const totalPossible = 8;
    const scorePercent = data.scorePercent !== undefined ? data.scorePercent : Math.min(100, Math.round((newMarks / totalPossible) * 100));

    return this.upsert(userId, {
      coding: { 
        ...data, 
        marksObtained: newMarks,
        scorePercent,
        completedAt: new Date() 
      }
    });
  }

  async recordHRPerformance(userId, data) {
    const current = await PerformanceAnalysis.findOne({ user: new Types.ObjectId(userId) }).lean();
    const prevMarks = current?.hr?.marksObtained || 0;
    
    // Marks obtained in HR: if explicitly passed in data (marksObtained), use it.
    // If data.score is passed and it is a low mark (<= 14), we use that.
    // Otherwise calculate from the percentage score.
    let newMarks = data.marksObtained !== undefined ? data.marksObtained : prevMarks + (data.score && data.score <= 14 ? data.score : 0);
    const totalPossible = 14;
    
    let scorePercent = data.scorePercent !== undefined ? data.scorePercent : (data.score && data.score > 14 ? data.score : Math.min(100, Math.round((newMarks / totalPossible) * 100)));
    
    if (data.score && data.score > 14 && data.marksObtained === undefined) {
      // If we only got a high percentage score, calculate marksObtained from it
      newMarks = Math.round((data.score / 100) * totalPossible);
    }

    return this.upsert(userId, {
      hr: { 
        ...data, 
        marksObtained: newMarks,
        scorePercent,
        completedAt: new Date() 
      }
    });
  }

  async updateViolations(userId, logs) {
    const count = logs.length;
    const trustScore = Math.max(0, 100 - (count * 10));
    return this.upsert(userId, {
      violations: { count, trustScore, logs }
    });
  }

  async buildGapAnalysis(userId) {
    console.log(`[PerformanceAnalysisService] Building gap analysis for user ${userId}`);
    
    // Ensure record exists using findOneAndUpdate with upsert
    let perf = await PerformanceAnalysis.findOneAndUpdate(
      { user: new Types.ObjectId(userId) },
      { $setOnInsert: { 
          mcq: { score: 0, weakAreas: [] },
          aptitude: { percentage: 0 },
          coding: { scorePercent: 0 },
          resume: { skills: [] }
        } 
      },
      { upsert: true, new: true }
    ).lean();

    const mcqScore = perf.mcq?.score ?? 0;
    const aptScore = perf.aptitude?.percentage ?? 0;
    const codingScore = perf.coding?.scorePercent ?? 0;

    let theoryVsPractical = 'Balanced';
    if (mcqScore >= 70 && codingScore < 50) theoryVsPractical = 'Theory-Strong / Practical-Weak';
    else if (mcqScore < 50 && codingScore >= 70) theoryVsPractical = 'Practical-Strong / Theory-Weak';
    else if (mcqScore < 50 && codingScore < 50) theoryVsPractical = 'Needs Development';

    const gapAnalysis = {
      theoryVsPractical,
      strongDomains: [],
      weakDomains: [],
      strengths: [],
      improvements: [],
      overallReadiness: (mcqScore + aptScore + codingScore) / 3 >= 70 ? 'Strong' : 'Moderate',
      recommendedQuestionFocus: [],
      analyzedAt: new Date()
    };

    // 1. Fetch AI Insights
    try {
      const aiInsights = await this.aiService.generatePersonalizedGapAnalysis(perf);
      if (aiInsights) {
        gapAnalysis.strengths = aiInsights.strengths || [];
        gapAnalysis.improvements = aiInsights.improvements || [];
        gapAnalysis.theoryVsPractical = aiInsights.theoryVsPractical || theoryVsPractical;
        gapAnalysis.overallReadiness = aiInsights.overallReadiness || gapAnalysis.overallReadiness;
      }
    } catch (e) {
      console.warn('[PerformanceAnalysisService] AI Analysis failed, using rule-based fallback.');
    }

    // 2. Rule-based Fallbacks (if AI returned empty or failed)
    if (gapAnalysis.strengths.length === 0) {
      if (mcqScore >= 75) {
        gapAnalysis.strongDomains.push('Theoretical Knowledge');
        gapAnalysis.strengths.push('Strong grasp of technical fundamentals and core concepts.');
      }
      if (aptScore >= 75) {
        gapAnalysis.strongDomains.push('Logical Reasoning');
        gapAnalysis.strengths.push('Excellent analytical and problem-solving abilities.');
      }
      if (codingScore >= 70) {
        gapAnalysis.strongDomains.push('Code Implementation');
        gapAnalysis.strengths.push('Proficient in translating logic into working, efficient code.');
      }
    }

    if (gapAnalysis.improvements.length === 0) {
      if (mcqScore < 50) gapAnalysis.improvements.push('Review fundamental CS concepts and documentation.');
      if (aptScore < 50) gapAnalysis.improvements.push('Practice quantitative and logical reasoning puzzles.');
      if (codingScore < 50) gapAnalysis.improvements.push('Focus on data structures and algorithm implementation.');
    }
    
    // Final default fallback
    if (gapAnalysis.strengths.length === 0) gapAnalysis.strengths.push('Completed all required assessment rounds.');
    if (gapAnalysis.improvements.length === 0) gapAnalysis.improvements.push('Continue practicing advanced interview scenarios.');

    if (mcqScore >= 70) gapAnalysis.strongDomains.push('Theoretical Knowledge');
    if (aptScore >= 70) gapAnalysis.strongDomains.push('Logical Reasoning');
    if (codingScore >= 70) gapAnalysis.strongDomains.push('Code Implementation');

    await PerformanceAnalysis.updateOne({ user: new Types.ObjectId(userId) }, { $set: { gapAnalysis } });
    return gapAnalysis;
  }

  async getFullProfile(userId) {
    let perf = await PerformanceAnalysis.findOne({ user: new Types.ObjectId(userId) }).lean();
    if (!perf) {
      await this.buildGapAnalysis(userId);
      perf = await PerformanceAnalysis.findOne({ user: new Types.ObjectId(userId) }).lean();
    }

    const student = await User.findById(new Types.ObjectId(userId)).lean();
    const isInstitutional = student && !!student.institutionId;

    const mcqScore = perf.mcq?.score ?? 0;
    const aptScore = perf.aptitude?.percentage ?? 0;
    const codingScore = perf.coding?.scorePercent ?? 0;
    const hrScore = perf.hr?.scorePercent ?? perf.hr?.score ?? 0;

    const overallScore = isInstitutional
      ? Math.round(((aptScore * 0.2) + (codingScore * 0.3) + (hrScore * 0.3)) / 0.8)
      : Math.round((mcqScore * 0.2) + (aptScore * 0.2) + (codingScore * 0.3) + (hrScore * 0.3));

    const gap = perf.gapAnalysis || await this.buildGapAnalysis(userId);

    return { 
      ...perf, 
      gapAnalysis: gap,
      overallScore,
      isInstitutional
    };
  }

  async resetPerformance(userId) {
    return PerformanceAnalysis.findOneAndUpdate(
      { user: new Types.ObjectId(userId) },
      { $set: { mcq: {}, resume: {}, aptitude: {}, coding: {}, hr: {}, gapAnalysis: {} } },
      { upsert: true, new: true }
    );
  }
}
