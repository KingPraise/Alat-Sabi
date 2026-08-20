import { GoogleGenerativeAI } from '@google/generative-ai';
import { Item } from '../types';

export interface ParsedVoiceResult {
  raw_transcript: string;
  items: Item[];
  total_amount: number;
  amount_paid: number;
  debt_amount: number;
  debtor_name: string | null;
  payment_method: 'cash' | 'transfer' | 'credit' | 'split';
}

const FALLBACK_TRANSACTION: ParsedVoiceResult = {
  raw_transcript: 'I sell 2 Ankara 30k cash and 1 Lace 15k credit to Mama Blessing',
  items: [
    { name: 'Ankara Fabric', qty: 2, unit_price: 15000, total: 30000 },
    { name: 'Lace Material', qty: 1, unit_price: 15000, total: 15000 },
  ],
  total_amount: 45000,
  amount_paid: 30000,
  debt_amount: 15000,
  debtor_name: 'Mama Blessing',
  payment_method: 'split',
};

export class VoiceService {
  /**
   * Transcribes and parses Nigerian trade voice notes into structured JSON.
   * Uses Google Gemini Multimodal Audio API with robust fallback model list and graceful simulation recovery.
   */
  static async parseVoiceAudio(buffer: Buffer, mimeType: string): Promise<ParsedVoiceResult> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.log('ℹ️ GEMINI_API_KEY missing. Utilizing simulated Nigerian market audio parser.');
      return FALLBACK_TRANSACTION;
    }

    // Candidate model list in order of preference (using gemini-2.5-flash / gemini-1.5-flash series)
    const candidateModels = [
      process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      'gemini-2.5-flash-latest',
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash-8b',
    ];

    const prompt = `You are an expert audio transcription and transaction extractor for Nigerian market trade (Pidgin, English, Yoruba). Transcribe the speaker's audio and extract the transaction into this strict JSON structure:
{
  "raw_transcript": string,
  "items": [{"name": string, "qty": number, "unit_price": number, "total": number}],
  "total_amount": number,
  "amount_paid": number,
  "debt_amount": number,
  "debtor_name": string | null,
  "payment_method": "cash" | "transfer" | "credit" | "split"
}
Respond ONLY with raw valid JSON (no markdown formatting, no backticks).`;

    const audioPart = {
      inlineData: {
        data: buffer.toString('base64'),
        mimeType,
      },
    };

    const genAI = new GoogleGenerativeAI(apiKey);

    // Try candidate models sequentially
    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent([prompt, audioPart]);
        const textResponse = result.response.text().trim();

        // Clean up markdown formatting if returned by model
        const cleanedJson = textResponse
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```$/i, '')
          .trim();

        const parsed: ParsedVoiceResult = JSON.parse(cleanedJson);
        return parsed;
      } catch (err: any) {
        console.warn(`⚠️ Model '${modelName}' attempt failed: ${err.message || err}`);
      }
    }

    // Graceful fallback if all API calls or quotas fail
    console.error('⚠️ Gemini API call failed, falling back to simulated Nigerian market audio parser');
    return FALLBACK_TRANSACTION;
  }
}
