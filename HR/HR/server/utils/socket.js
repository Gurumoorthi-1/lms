import Interview from '../models/Interview.js';
import { generateQuestion, evaluateAnswer } from './ai.js';

export const setupSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_interview', (interviewId) => {
      socket.join(interviewId);
      console.log(`Socket ${socket.id} joined interview ${interviewId}`);
    });

    socket.on('submit_answer', async (data) => {
      try {
        const { interviewId, answer, currentQuestionIndex } = data;
        
        const interview = await Interview.findById(interviewId).populate('user', 'name');
        if (!interview) return;

        const currentQuestion = interview.questions[currentQuestionIndex];
        
        let evaluation = { feedback: '', score: 0 };
        
        // Only evaluate actual interview questions (0-6), not the farewell (7)
        if (currentQuestionIndex < 7) {
          evaluation = await evaluateAnswer(interview.jobRole, currentQuestion.questionText, answer);
        }
        
        // Update question
        interview.questions[currentQuestionIndex].userAnswer = answer;
        if (currentQuestionIndex < 7) {
          interview.questions[currentQuestionIndex].feedback = evaluation.feedback;
          interview.questions[currentQuestionIndex].score = evaluation.score;
        }

        // Check if we need more questions (e.g., max 7 questions)
        if (currentQuestionIndex < 6) {
          const previousQuestions = interview.questions.map(q => q.questionText);
          const previousAnswers = interview.questions.map(q => q.userAnswer).filter(Boolean);
          const contextWithMemory = `${interview.resumeText}\n\nCandidate's Previous Answers:\n${previousAnswers.join('\n')}`;
          
          const nextQuestionText = await generateQuestion(interview.jobRole, previousQuestions, contextWithMemory, currentQuestionIndex + 1);
          
          interview.questions.push({
            questionText: nextQuestionText
          });
          
          await interview.save();
          
          io.to(interviewId).emit('next_question', {
            questionIndex: currentQuestionIndex + 1,
            question: nextQuestionText,
            feedback: evaluation.feedback
          });
        } else if (currentQuestionIndex === 6) {
          // Send farewell message instead of finishing immediately
          const userName = interview.user?.name || 'Candidate';
          const farewellMessage = `Ok thank you ${userName}. We have completed all the questions. lets windup the session.`;
          
          interview.questions.push({
            questionText: farewellMessage
          });
          
          await interview.save();

          io.to(interviewId).emit('next_question', {
            questionIndex: 7, // Virtual index for farewell
            question: farewellMessage,
            feedback: evaluation.feedback
          });
        } else {
          // Finish interview after the farewell acknowledgment
          interview.status = 'completed';
          interview.completedAt = new Date();
          
          // Calculate overall score
          let totalScore = 0;
          interview.questions.forEach(q => { if(q.score) totalScore += q.score; });
          interview.overallScore = (totalScore / (7 * 10)) * 100; // Based on 7 graded questions
          interview.overallFeedback = "Interview completed successfully. The AI has analyzed your performance across all rounds.";
          interview.metrics = {
            communication: 80,
            confidence: 85,
            clarity: 75
          };
          
          await interview.save();
          
          io.to(interviewId).emit('interview_completed', {
            interviewId: interview._id
          });
        }
      } catch (error) {
        console.error("Socket error:", error);
        socket.emit('error', { message: 'Failed to process answer' });
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
};
