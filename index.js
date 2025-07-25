// index.js
import express from 'express';
import cors from 'cors';
import db from './firebase.js'; // Ensure firebase.js uses export default
import { handleChat } from './groq-chat/chat.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Get all CRM data for a company
app.get('/crm/:companyId', async (req, res) => {
  const companyId = req.params.companyId;

  try {
    const crmSnapshot = await db
      .collection('userData')
      .doc(companyId)
      .collection('CRMdata')
      .get();

    const crmData = crmSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(crmData);
  } catch (error) {
    console.error('Error fetching CRM data:', error);
    res.status(500).send('Failed to fetch CRM data');
  }
});

app.post('/chat/:companyId', async (req, res) => {
  const companyId = req.params.companyId;
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required in request body' });
  }

  try {
    const aiResponse = await handleChat(companyId, message);
    res.json({ response: aiResponse });
  } catch (error) {
    console.error('❌ Error handling chat:', error.message);
    res.status(500).json({ error: 'Failed to process AI chat' });
  }
});

app.get('/', (req, res) => {
  res.send('Server is running');
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
