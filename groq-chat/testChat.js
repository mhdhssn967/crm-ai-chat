import getAIResponse from './chat.js';
import dotenv from 'dotenv';
dotenv.config();

const test = async () => {
  const companyId = 'YOUR_COMPANY_ID'; // Replace with a real document ID from Firestore
  const question = 'Tell me about my top customers this month.';

  const response = await getAIResponse(companyId, question);
  console.log('AI Response:', response);
};

test();
