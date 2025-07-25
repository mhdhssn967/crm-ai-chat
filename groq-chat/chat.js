import dotenv from 'dotenv';
import path from 'path';
import axios from 'axios';

dotenv.config({
  path: path.resolve('./groq-chat/.env') // 🔥 Adjusted to work even when called from index.js
});

const API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = process.env.GROQ_API_KEY;

async function fetchCRMData(id) {
  try {
    const response = await axios.get(`https://crm-ai-chat.onrender.com/crm/${id}`);
    return response.data || [];
  } catch (error) {
    console.error('❌ Error fetching CRM data:', error.message);
    return [];
  }
}

// ✅ Convert all fields to CSV format
function convertToCSV(data) {
  const headers = ['Client Name', 'Place', 'Last Contacted', 'Status', 'Remarks', 'Next Follow-Up'];
  const rows = data.map(entry => [
    `"${(entry.clientName || '').replace(/"/g, '""')}"`,
    `"${(entry.place || '').replace(/"/g, '""')}"`,
    `"${(entry.lastContacted || '').replace(/"/g, '""')}"`,
    `"${(entry.currentStatus || '').replace(/"/g, '""')}"`,
    `"${(entry.remarks || '').replace(/"/g, '""')}"`,
    `"${(entry.nextFollowUp || '').replace(/"/g, '""')}"`,
    `"${(entry.employeeName || '').replace(/"/g, '""')}"`
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

async function askGroqWithPrompt(csvData, userQuestion) {
  try {
    const systemPrompt = `You are a CRM assistant. The following is a CSV of client data:\n\n${csvData}\n\nUse this to answer the user's question. Other data such as phone number and email are availabel to the user in the record table`;

    const response = await axios.post(API_URL, {
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userQuestion }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      }
    });

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('❌ Error from Groq:', error.message);
    return '[Error in processing data]';
  }
}

export async function handleChat(companyId, userQuestion) {
  const crmData = await fetchCRMData(companyId);
  if (!crmData.length) {
    return 'No CRM data found.';
  }

  const filteredData = crmData.filter(entry =>
    (entry.currentStatus || '').toLowerCase().trim() !== 'deal lost'
  );

  if (!filteredData.length) {
    return 'All entries were marked as deal lost. Nothing to process.';
  }

  const csvFormatted = convertToCSV(filteredData);
  return await askGroqWithPrompt(csvFormatted, userQuestion);
}
