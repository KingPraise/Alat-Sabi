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

export class VoiceService {
  /**
   * Transcribes and parses Nigerian trade voice notes into structured JSON.
   * Uses Google Gemini Multimodal Audio API with fallback mocking if key is missing.
   */
  static async parseVoiceAudio(buffer: Buffer, mimeType: string): Promise<ParsedVoiceResult> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.log('ℹ️ GEMINI_API_KEY missing. Utilizing mock AI audio parser fallback.');
      return {
        raw_transcript: 'I sell 2 Ankara fabrics for 30 thousand naira cash and 1 lace 15 thousand credit to Mama Blessing',
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
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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
    } catch (error) {
      console.error('⚠️ Gemini Audio AI Extraction Failed:', error);
      throw new Error(`Failed to transcribe and parse audio note: ${(error as Error).message}`);
    }
  }
}
