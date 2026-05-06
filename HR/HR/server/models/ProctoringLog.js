import mongoose from 'mongoose';

const proctoringLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  interviewId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Interview',
    required: true
  },
  warnings: [
    {
      type: {
        type: String,
        required: true
      },
      message: {
        type: String,
        required: true
      },
      time: {
        type: Date,
        default: Date.now
      }
    }
  ]
}, { timestamps: true });

const ProctoringLog = mongoose.model('ProctoringLog', proctoringLogSchema);

export default ProctoringLog;
