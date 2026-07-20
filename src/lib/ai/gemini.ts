// Stable alias — avoids breaking again when a specific dated model gets deprecated.
const GEMINI_MODEL = "gemini-flash-latest";

export interface FunctionDeclaration {
    name: string;
    description: string;
    parameters: {
        type: "OBJECT";
        properties: Record<string, { type: string; description?: string }>;
        required?: string[];
    };
}

export type GeminiResult =
    | { type: "text"; text: string }
    | { type: "functionCall"; name: string; args: Record<string, any> };

/**
 * Thin wrapper around the Gemini REST API. Basic Q&A by default (the project
 * scope explicitly excludes an "advanced NLP chatbot"); optionally accepts a
 * small, explicit set of function declarations so the model can propose a
 * single well-defined action instead of free text. The caller is always
 * responsible for actually executing a proposed action — this function only
 * ever returns intent, never performs a side effect itself.
 */
export async function askGemini(
    systemContext: string,
    userMessage: string,
    tools?: FunctionDeclaration[]
): Promise<GeminiResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured. Add it to .env to enable the assistant.");
    }

    const body: any = {
        system_instruction: {
            parts: [{ text: systemContext }],
        },
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
        generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 300,
        },
    };

    if (tools && tools.length > 0) {
        body.tools = [{ function_declarations: tools }];
    }

    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        }
    );

    if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`Gemini API error (${res.status}): ${errBody.slice(0, 300)}`);
    }

    const json = await res.json();
    const parts = json?.candidates?.[0]?.content?.parts || [];

    const functionCallPart = parts.find((p: any) => p.functionCall);
    if (functionCallPart) {
        return { type: "functionCall", name: functionCallPart.functionCall.name, args: functionCallPart.functionCall.args || {} };
    }

    const text = parts.find((p: any) => p.text)?.text;
    if (!text) {
        throw new Error("Gemini returned no response text.");
    }
    return { type: "text", text: text.trim() };
}
