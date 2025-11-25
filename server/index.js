import * as dotenv from 'dotenv';
dotenv.config();


import cors from 'cors';
import express from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs/promises';
import { answerQuestion, ingestDocument } from './rag.js';

const app = express();
const PORT = process.env.PORT ?? 8000;
const uploadDir = path.join(process.cwd(), 'uploads');

await fs.mkdir(uploadDir, { recursive: true });

const upload = multer({
  dest: uploadDir,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      cb(new Error('Only PDF files are allowed'));
      return;
    }
    cb(null, true);
  },
  limits: {
    fileSize: Number(process.env.MAX_UPLOAD_BYTES ?? 25 * 1024 * 1024),
  },
});

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? true,
  }),
);
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/upload/pdf', upload.single('pdf'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'PDF file is required' });
    return;
  }

  try {
    await ingestDocument(req.file.path);
    res.json({ message: 'PDF ingested successfully' });
  } catch (error) {
    console.error('Failed to ingest PDF:', error);
    res.status(500).json({ error: 'Failed to ingest PDF' });
  } finally {
    await safeRemoveFile(req.file.path);
  }
});

app.post('/chat', async (req, res) => {
  const { message } = req.body ?? {};

  if (!message?.trim()) {
    res.status(400).json({ error: 'Message is required' });
    return;
  }

  try {
    const response = await answerQuestion(message);
    res.json(response);
  } catch (error) {
    console.error('Chat error:', error);
    
    // Handle specific error types
    if (error.status === 429) {
      res.status(429).json({ 
        error: 'Rate limit exceeded. Please try again in a few seconds.',
        retryAfter: 20 
      });
    } else if (error.message?.includes('quota')) {
      res.status(503).json({ 
        error: 'Service temporarily unavailable due to quota limits. Please try again later.' 
      });
    } else {
      res.status(500).json({ error: 'Failed to generate response' });
    }
  }
});

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    res.status(400).json({ error: err.message });
    return;
  }

  if (err) {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
    return;
  }
});

app.post('/cleanup', async (req, res) => {
  const { userNamespace } = req.body;
  try {
    await deleteUserVectors(userNamespace);
    res.json({ message: 'Vectors deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete vectors' });
  }
})

// const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
// const index = pinecone.Index('your-index-name');


async function deleteUserVectors(userNamespace) {
  await index.namespace(userNamespace).deleteAll();
}

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

async function safeRemoveFile(filePath) {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`Unable to delete file ${filePath}:`, error);
    }
  }
}