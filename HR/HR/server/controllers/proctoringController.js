import ProctoringLog from '../models/ProctoringLog.js';

export const logWarning = async (req, res) => {
  try {
    const { interviewId, type, message } = req.body;
    const userId = req.user.id;

    let log = await ProctoringLog.findOne({ userId, interviewId });

    if (!log) {
      log = new ProctoringLog({
        userId,
        interviewId,
        warnings: []
      });
    }

    log.warnings.push({ type, message });
    await log.save();

    res.status(200).json({ success: true, message: 'Warning logged successfully' });
  } catch (error) {
    console.error('Proctoring Log Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
