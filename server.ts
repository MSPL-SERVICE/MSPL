import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

  // Body parser
  app.use(express.json());

  // API endpoint for Gemini Advisor
  app.post("/api/gemini/advisor", async (req, res) => {
    try {
      const { prompt, chatHistory = [], context = {} } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt parameter is required." });
      }

      let apiKey = process.env.GEMINI_API_KEY || "AIzaSyDt8cQQvCP1A_Jjn7qoU4A9VwhjYMTjvS8";
      if (apiKey) {
        apiKey = apiKey.replace(/['"]/g, "").trim();
      }

      if (!apiKey) {
        // Safe placeholder fallback response when API key is not configured in Settings > Secrets
        const mockResponses: { [key: string]: string } = {
          "capabilities": "As **Magnifiq AI Advisor**, I stand ready to assist! Magnifiq Services Private Limited (formerly Tel Tower Private Limited) is leading telco towers and high-density PV solar grid installations. Live inventory holds structural modules, diesel generators, and 5G transceiver bands. You can customize shift assignments, coordinate optical fiber trenching, or authorize GPX-verified attendance logs.",
          "rfp": "### Turnkey 10-Tower Erection Proposal Draft\n\n**Prepared For:** Client Procurement Matrix\n**Prepared By:** Magnifiq Services Private Limited Engineering Division\n\n1. **Engineering Scope:** Supply, rigging, and certified foundation engineering for 10 structural lattice telecom towers.\n2. **Compliance Key:** 100% Guntur-monitored GPS clock-in telemetry to guarantee zero-spoof labor audit records.\n3. **Inventory Allocations:** 10 lattice tower kits, 10 backup heavy fuel diesel generators, and fiber patch panel junctions.\n\n*Activate your live `GEMINI_API_KEY` inside Settings > Secrets to unlock custom model-driven automatic estimates based on actual live items.*",
          "default": "Greetings! I am the **Magnifiq AI Advisor**. In order to connect this to real-time Gemini intelligence, please add your `GEMINI_API_KEY` in the **Settings > Secrets** panel in AI Studio.\n\nOnce configured, I can instantly query inventory status, draft custom RFP bids, formulate employee shift rosters, and optimize diesel generator consumption ratios live!"
        };

        let pickedResp = mockResponses.default;
        const lowerPrompt = prompt.toLowerCase();
        if (lowerPrompt.includes("capability") || lowerPrompt.includes("installation") || lowerPrompt.includes("solar") || lowerPrompt.includes("tower")) {
          pickedResp = mockResponses.capabilities;
        } else if (lowerPrompt.includes("proposal") || lowerPrompt.includes("rfp") || lowerPrompt.includes("bid")) {
          pickedResp = mockResponses.rfp;
        }

        return res.json({
          text: pickedResp + "\n\n*(Note: To activate live AI, please save your `GEMINI_API_KEY` key in AI Studio's Secrets panel.)*",
          isDemo: true
        });
      }

      // Live instance with User-Agent set for AI Studio build standards
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      // Assemble system instruction with business metadata to offer personalized advising
      const systemInstruction = 
        `You are Magnifiq AI Advisor, a super-intelligent engineering, logistics, and HR agent for Magnifiq Services Private Limited (formerly known as Tel Towers Private Limited).\n` +
        `Your headquarters are based in Hyderabad, Telangana, India.\n` +
        `The central HR working mailbox is hr@magnifiq.in for all dispatcher resolutions.\n` +
        `Magnifiq specializes in erecting heavy lattice towers, high-density fiber backhauls, optical fusion splicing, railway quad cabin signaling, and utility-scale PV solar farm grids.\n` +
        `Respond to user inquiries as a helpful corporate advisor. You have access to the following current corporate context:\n` +
        `- Current Live Inventory: ${context.inventoryCount || "dynamic telecon components"}\n` +
        `- Active Crew Members: ${context.employeesCount || "certified technicians"}\n` +
        `- Active Regional Projects: ${context.projectsCount || "turnkey installations"}\n\n` +
        `Provide authoritative, clear engineering and HR insights. Format your output using elegant Markdown with bold key terms, tables, or bullet points. Avoid clinical system telemetry references; remain polite, human, and professional.`;

      // Query Gemini model gemini-3.5-flash
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          ...chatHistory.map((item: any) => ({
            role: item.role === "user" ? "user" : "model",
            parts: [{ text: item.text }]
          })),
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        },
      });

      return res.json({
        text: response.text || "I processed your request, but did not generate a text response."
      });
    } catch (error: any) {
      console.error("Gemini Advisor Endpoint Error:", error);
      return res.status(500).json({
        error: "Internal secure routing failure.",
        details: error.message || error
      });
    }
  });

  // Serve static files in production / Vite middleware in development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Magnifiq Engine] Full-stack server active at http://localhost:${PORT}`);
  });
}

startServer();
