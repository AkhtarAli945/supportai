const { groq, MODEL } = require("../config/groq");

/**
 * Generic chat completion call to Groq (Llama 3.3 70B).
 * messages: [{ role: 'system'|'user'|'assistant', content: string }]
 */
async function chatCompletion(messages, { temperature = 0.4, maxTokens = 700, jsonMode = false } = {}) {
  const response = await groq.chat.completions.create({
    model: MODEL,
    messages,
    temperature,
    max_tokens: maxTokens,
    response_format: jsonMode ? { type: "json_object" } : undefined,
  });

  return response.choices[0].message.content;
}

module.exports = { chatCompletion };
