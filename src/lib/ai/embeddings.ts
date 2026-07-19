// Server-only module: imports @xenova/transformers, which relies on Node APIs
// (fs, onnxruntime-node) and must never be bundled into client components.

// Lazily-loaded local pretrained sentence embedding model (Xenova/all-MiniLM-L6-v2).
// Runs fully in-process (Node), no API key and no network call after the first
// download, which pulls and caches the ~23MB quantized model weights.
let extractorPromise: Promise<any> | null = null;

async function getExtractor() {
    if (!extractorPromise) {
        extractorPromise = (async () => {
            const { pipeline } = await import("@xenova/transformers");
            return pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
        })();
    }
    return extractorPromise;
}

async function embed(text: string): Promise<Float32Array> {
    const extractor = await getExtractor();
    const output = await extractor(text, { pooling: "mean", normalize: true });
    return output.data as Float32Array;
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
    let dot = 0;
    for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
    // Vectors are already L2-normalized (normalize: true above), so the dot product IS the cosine similarity.
    return dot;
}

const STOPWORDS = new Set([
    "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with", "at",
    "by", "is", "are", "was", "were", "be", "been", "being", "as", "that",
    "this", "it", "we", "you", "i", "our", "their", "have", "has", "had",
    "will", "would", "can", "could", "should", "years", "year", "experience",
    "skills", "role", "team", "work", "working", "using", "used", "including",
]);

function significantWords(text: string): Set<string> {
    return new Set(
        text
            .toLowerCase()
            .replace(/[^a-z0-9+.#\s]/g, " ")
            .split(/\s+/)
            .filter((w) => w.length > 2 && !STOPWORDS.has(w))
    );
}

export interface ResumeScoreResult {
    score: number;
    reason: string;
}

/**
 * Scores a candidate's resume/skills text against a role description using a
 * local pretrained sentence-embedding model for semantic similarity, plus a
 * lexical overlap pass to produce an explainable one-line rationale.
 */
export async function scoreResumeAgainstRole(
    resumeText: string,
    roleDescription: string
): Promise<ResumeScoreResult> {
    const [resumeVec, roleVec] = await Promise.all([
        embed(resumeText),
        embed(roleDescription),
    ]);

    const similarity = cosineSimilarity(resumeVec, roleVec);
    // Rescale raw cosine similarity (typically ~0.2-0.75 for related short texts
    // with this model) into a more legible 0-100 HR-style score.
    const score = Math.max(0, Math.min(100, Math.round((similarity - 0.15) / 0.6 * 100)));

    const resumeWords = significantWords(resumeText);
    const roleWords = significantWords(roleDescription);
    const overlap = [...resumeWords].filter((w) => roleWords.has(w)).slice(0, 6);

    const reason = overlap.length > 0
        ? `Semantic match ${(similarity * 100).toFixed(0)}%. Overlapping terms: ${overlap.join(", ")}.`
        : `Semantic match ${(similarity * 100).toFixed(0)}%. Little direct keyword overlap with the role description.`;

    return { score, reason };
}
