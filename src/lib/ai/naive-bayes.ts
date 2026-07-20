/**
 * Multinomial Naive Bayes text classifier — trained from scratch on our own
 * labeled examples, no pretrained weights, no external API. This is the
 * textbook algorithm (Bayes' rule over word-likelihoods with Laplace
 * smoothing), implemented directly rather than imported from a library, so
 * it's fully inspectable and explainable.
 *
 * Training happens once, in-process, at module load — it's a few hundred
 * short examples, so it trains in well under a millisecond. There's no
 * separate "training script" producing a weights file because there's no
 * need to: the model is small enough to retrain on every server start,
 * which is also why it can never go stale relative to its training data.
 */

export interface LabeledExample {
    text: string;
    label: string;
}

export interface NaiveBayesModel {
    classes: string[];
    priors: Record<string, number>; // log P(class)
    wordLogLikelihoods: Record<string, Record<string, number>>; // class -> word -> log P(word|class)
    defaultLogLikelihood: Record<string, number>; // class -> log P(unseen word|class)
    vocabSize: number;
}

function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 1);
}

export function trainNaiveBayes(examples: LabeledExample[]): NaiveBayesModel {
    const classes = Array.from(new Set(examples.map((e) => e.label)));
    const classCounts: Record<string, number> = {};
    const wordCounts: Record<string, Record<string, number>> = {};
    const totalWordsPerClass: Record<string, number> = {};
    const vocab = new Set<string>();

    for (const cls of classes) {
        classCounts[cls] = 0;
        wordCounts[cls] = {};
        totalWordsPerClass[cls] = 0;
    }

    for (const { text, label } of examples) {
        classCounts[label]++;
        for (const word of tokenize(text)) {
            vocab.add(word);
            wordCounts[label][word] = (wordCounts[label][word] || 0) + 1;
            totalWordsPerClass[label]++;
        }
    }

    const vocabSize = vocab.size;
    const totalExamples = examples.length;

    const priors: Record<string, number> = {};
    const wordLogLikelihoods: Record<string, Record<string, number>> = {};
    const defaultLogLikelihood: Record<string, number> = {};

    for (const cls of classes) {
        priors[cls] = Math.log(classCounts[cls] / totalExamples);
        wordLogLikelihoods[cls] = {};
        for (const word of Object.keys(wordCounts[cls])) {
            // Laplace (add-one) smoothing.
            wordLogLikelihoods[cls][word] = Math.log((wordCounts[cls][word] + 1) / (totalWordsPerClass[cls] + vocabSize));
        }
        defaultLogLikelihood[cls] = Math.log(1 / (totalWordsPerClass[cls] + vocabSize));
    }

    return { classes, priors, wordLogLikelihoods, defaultLogLikelihood, vocabSize };
}

export function classify(model: NaiveBayesModel, text: string): { label: string; confidence: number; scores: Record<string, number> } {
    const words = tokenize(text);
    const scores: Record<string, number> = {};

    for (const cls of model.classes) {
        let score = model.priors[cls];
        for (const word of words) {
            score += model.wordLogLikelihoods[cls][word] ?? model.defaultLogLikelihood[cls];
        }
        scores[cls] = score;
    }

    // Softmax over the log-scores for an interpretable confidence value.
    const maxScore = Math.max(...Object.values(scores));
    const expScores: Record<string, number> = {};
    let sumExp = 0;
    for (const cls of model.classes) {
        expScores[cls] = Math.exp(scores[cls] - maxScore);
        sumExp += expScores[cls];
    }

    let bestLabel = model.classes[0];
    let bestProb = 0;
    for (const cls of model.classes) {
        const prob = expScores[cls] / sumExp;
        if (prob > bestProb) {
            bestProb = prob;
            bestLabel = cls;
        }
    }

    return { label: bestLabel, confidence: bestProb, scores };
}
