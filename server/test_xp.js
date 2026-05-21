const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/lms').then(async () => {
  const { ExamsService } = require('./src/exams/exams.service.js');
  const svc = new ExamsService();
  
  const user = await mongoose.connection.collection('users').findOne({}); // Just grab the first user
  if(!user) { console.log('User not found'); process.exit(0); }
  
  const before = await svc.getAnalytics(user._id.toString());
  console.log('XP BEFORE RESET:', before.totalXP);
  
  // Fake exam score reset calculation
  let fakeXP = 0;
  // Imagine we reset score to 0 for all exams
  const exams = await mongoose.connection.collection('exams').find({ userId: user._id }).toArray();
  const personalExams = await mongoose.connection.collection('personalexams').find({ userId: user._id }).toArray();
  const allExams = [...exams, ...personalExams];
  console.log('Total Exams:', allExams.length);
  
  fakeXP = allExams.reduce((s, e) => s + 100 + (Math.round(((Number(0) || 0) / 100) * (Number(e.questionCount) || 0)) * 10), 0);
  console.log('XP AFTER RESET:', fakeXP);
  process.exit(0);
});
