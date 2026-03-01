import express from "express";
import textToSpeech from "@google-cloud/text-to-speech";
import { authenticateToken } from "../Middlewares/authMiddleware.js";

const router = express.Router();

// Reuse the same service account key used for Google STT
const ttsClient = new textToSpeech.TextToSpeechClient({
  keyFilename: "keys/google-stt.json",
});

// Voice config — Neural2 voices are high quality and within the free tier
const DEFAULT_VOICE_NAME = process.env.GCP_TTS_VOICE || "en-US-Neural2-D"; // professional male
const DEFAULT_LANGUAGE_CODE = process.env.GCP_TTS_LANGUAGE || "en-US";

/**
 * Strip symbols that TTS engines tend to speak aloud but shouldn't.
 * Keeps natural punctuation (. , ? !) so pauses still sound right.
 */
function sanitizeForTTS(raw) {
  return raw
    // Remove code-style symbols
    .replace(/[`*_~|\\^]/g, "")
    // Remove angle brackets and their content (e.g. <br/>, <tag>)
    .replace(/<[^>]*>/g, "")
    // Remove brackets but keep their content
    .replace(/[[\]{}()]/g, "")
    // Remove hash / at / hash symbols
    .replace(/[#@]/g, "")
    // Remove semicolons and colons (often read as "semicolon")
    .replace(/[;:]/g, ",")
    // Remove slash and backslash
    .replace(/[/\\]/g, " ")
    // Collapse multiple spaces/newlines into a single space
    .replace(/\s+/g, " ")
    .trim();
}

router.post("/synthesize", authenticateToken, async (req, res) => {
  try {
    const { text = "", voiceName = DEFAULT_VOICE_NAME } = req.body || {};

    const cleanText = sanitizeForTTS(text);

    if (!cleanText) {
      return res.status(400).json({ error: "Text is required" });
    }

    const [response] = await ttsClient.synthesizeSpeech({
      input: { text: cleanText },
      voice: {
        languageCode: DEFAULT_LANGUAGE_CODE,
        name: voiceName,
      },
      audioConfig: {
        audioEncoding: "MP3",   // smallest size, universally supported by browsers
        speakingRate: 0.95,     // slightly slower — clearer for interviews
        pitch: 0,               // neutral pitch
      },
    });

    const audioBuffer = response.audioContent;

    if (!audioBuffer || !audioBuffer.length) {
      return res.status(502).json({ error: "Google Cloud TTS returned empty audio" });
    }

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-TTS-Provider", "google-cloud");
    res.setHeader("X-TTS-Model", "Neural2");
    res.setHeader("X-TTS-Audio-Format", "audio/mpeg");
    res.setHeader("X-TTS-Voice", voiceName);
    return res.send(audioBuffer);
  } catch (error) {
    console.error("Google Cloud TTS error:", error?.message || error);
    return res.status(500).json({ error: "Failed to synthesize speech" });
  }
});

export default router;