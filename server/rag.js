import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { QdrantClient } from "@qdrant/js-client-rest";
import { QdrantVectorStore } from "@langchain/qdrant";

import * as dotenv from 'dotenv';
dotenv.config();

console.log("Qdrant modules loaded successfully");

const googleApiKey = process.env.GOOGLE_API_KEY;

if (!googleApiKey) {
  throw new Error('Missing GOOGLE_API_KEY in environment variables');
}

const qdrantClient = new QdrantClient({ url: "http://localhost:6333" });

const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: googleApiKey,
  model: 'text-embedding-004',
});

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

export async function ingestDocument(pdfPath) {
  if (!pdfPath) throw new Error('No PDF path provided for ingestion');

  const loader = new PDFLoader(pdfPath);
  const docs = await loader.load();
  const chunkedDocs = await textSplitter.splitDocuments(docs);

  await QdrantVectorStore.fromDocuments(chunkedDocs, embeddings, {
    client: qdrantClient,
    collectionName: "ai_pdf_vectors",
  });

  console.log("PDF vectors uploaded successfully to Qdrant!");
}

export async function answerQuestion(question) {
  if (!question?.trim()) throw new Error("Question is required");

  const vectorStore = await QdrantVectorStore.fromExistingCollection(
    embeddings,
    {
      client: qdrantClient,
      collectionName: "ai_pdf_vectors",
    }
  );

  const results = await vectorStore.similaritySearch(question, 5);

  if (!results?.length) {
    return { message: "I could not find the answer in the provided document." };
  }

  // Build context
  const context = results
    .map((r) => r.pageContent)
    .filter(Boolean)
    .join("\n\n---\n\n");

//     console.log("\n================ CONTEXT SENT TO GEMINI =================\n");
// console.log(context);
// console.log("\n==========================================================\n");


  const ai = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  const model = ai.getGenerativeModel({ 
      model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    }
  });

  const prompt = `
You are a document-based assistant.
You will answer ONLY using the document context.

If the user asks something too broad (like "sorting", "unit 2", "syllabus"),
you MUST summarize the most relevant content from the document context.

If the answer is not directly mentioned, reply exactly:
"I could not find the answer in the provided document."

Question: ${question}

Context:
${context}
`;

  // Retry logic with exponential backoff
  const maxRetries =1;
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await model.generateContent(prompt);
      return {
        message: extractResponseText(response),
        sources: results
      };
    } catch (error) {
      lastError = error;
      
      // Check if it's a rate limit error
      if (error.status === 429 && attempt < maxRetries - 1) {
        const waitTime = Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10s
        console.log(`Rate limit hit. Retrying in ${waitTime}ms... (Attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      // If it's not a rate limit or we're out of retries, throw
      throw error;
    }
  }
  
  throw lastError;
}


function extractResponseText(response) {
  try {
    const text = response?.response?.text();
    return text || "No response generated.";
  } catch (error) {
    console.error("Error extracting response text:", error);
    return "Failed to extract response.";
  }
}
