import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';

const API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const crmId = 'Ovq274qYz5f065l6zbzMRafVFfl1';

// Safe limit (tokens ≈ chars / 3); 4000 is safe
const MAX_CHARS_PER_PROMPT = 4000;

async function fetchCRMData(id) {
  try {
    const response = await axios.get(`http://localhost:3001/crm/${id}`);
    return response.data || [];
  } catch (error) {
    console.error('❌ Error fetching CRM data:', error.message);
    return [];
  }
}

function formatEntry(entry, index) {
  return `
#${index + 1}
Client Name: ${entry.clientName?.trim()}
Place:${entry.place?.trim()}
Last Contacted: ${entry.lastContacted?.trim()}
Status: ${entry.currentStatus?.trim()}
Remarks: ${entry.remarks?.trim()}
Next Follow-Up: ${entry.nextFollowUp?.trim()}
`.trim();
}

function chunkFormattedEntries(formattedEntries) {
  const chunks = [];
  let currentChunk = '';
  
  for (const entry of formattedEntries) {
    if ((currentChunk + '\n\n' + entry).length > MAX_CHARS_PER_PROMPT) {
      chunks.push(currentChunk.trim());
      currentChunk = entry;
    } else {
      currentChunk += '\n\n' + entry;
    }
  }

  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
}

async function askGroqWithPrompt(formattedData, userQuestion) {
  try {
    const systemPrompt = `You are a CRM assistant. Based on the following client data, answer the user's question:\n\n${formattedData}`;
    
    const response = await axios.post(API_URL, {
      model: 'llama-3.3-70b-versatile', // safer and accurate model name
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

async function main() {
  const crmData = await fetchCRMData(crmId);
  if (!crmData.length) {
    console.log('No CRM data found.');
    return;
  }

  const userQuestion = 'Based on the data what do you think pur company sells';

  // ❗️Filter out "deal lost" status (case-insensitive)
  const filteredData = crmData.filter(entry =>
    (entry.currentStatus || '').toLowerCase().trim() !== 'deal lost'
  );

  if (!filteredData.length) {
    console.log('All entries were marked as deal lost. Nothing to process.');
    return;
  }

  const formattedEntries = filteredData.map((entry, i) => formatEntry(entry, i));
  const chunks = chunkFormattedEntries(formattedEntries);

  if (chunks.length === 1) {
    const response = await askGroqWithPrompt(chunks[0], userQuestion);
    console.log('\n🟢 Groq Response:\n', response);
  } else {
    const allResponses = [];

    for (let i = 0; i < chunks.length; i++) {
      console.log(`🧩 Processing chunk ${i + 1}/${chunks.length}...`);
      const response = await askGroqWithPrompt(chunks[i], userQuestion);
      allResponses.push(response);
    }

    console.log('\n🟢 Combined Groq Responses:\n');
    console.log(allResponses.join('\n\n'));
  }
}


main();
