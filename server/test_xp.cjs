const mongoose = require('mongoose');

async function test() {
  await mongoose.connect('mongodb://127.0.0.1:27017/lms');
  console.log('Connected');
  const user = await mongoose.connection.collection('users').findOne({});
  if(!user) return;
  console.log('User:', user.email);

  const exams = await mongoose.connection.collection('exams').find({ userId: user._id }).toArray();
  const personalExams = await mongoose.connection.collection('personal_exams').find({ userId: user._id }).toArray();
  const allExams = [...exams, ...personalExams];
  console.log('Exams found:', allExams.length);

  const beforeXP = allExams.reduce((s, e) => s + 100 + (Math.round(((Number(e.score) || 0) / 100) * (Number(e.questionCount) || 0)) * 10), 0);
  console.log('XP BEFORE RESET:', beforeXP);

  // simulate reset
  const afterXP = allExams.reduce((s, e) => s + 100 + (Math.round(((Number(0) || 0) / 100) * (Number(e.questionCount) || 0)) * 10), 0);
  console.log('XP AFTER RESET:', afterXP);
  
  process.exit(0);
}
test();
