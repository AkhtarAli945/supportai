// const { chatCompletion } = require("../services/groqService");
// const { retrieveRelevantChunks } = require("../services/vectorStore");
// const { tools } = require("./tools");

// /**
//  * SupportAI Agent Graph
//  * ---------------------
//  * Mirrors a LangGraph-style state machine with explicit nodes:
//  *
//  *   retrieve -> classifyIntent -> toolCall (conditional) -> answerOrEscalate -> summarize (on handoff)
//  *
//  * Each node receives and returns a shared `state` object, matching the mental
//  * model of LangGraph's StateGraph. This keeps the flow easy to port to real
//  * LangGraph.js (`@langchain/langgraph`) later without a redesign - swap this
//  * file's `runAgentGraph` for a compiled StateGraph and reuse the same nodes.
//  */

// // ---- Node: Retrieve ----
// async function retrieveNode(state) {
//   const chunks = await retrieveRelevantChunks(
//     state.workspaceId,
//     state.query,
//     4,
//   );
//   return { ...state, retrievedChunks: chunks };
// }

// // ---- Node: Classify Intent ----
// async function classifyIntentNode(state) {
//   const raw = await chatCompletion(
//     [
//       {
//         role: "system",
//         content:
//           "You are an intent + sentiment classifier for a customer support system. " +
//           'Respond ONLY with strict JSON: {"intent": "faq"|"order_status"|"complaint"|"human_request"|"refund", ' +
//           '"sentiment": "positive"|"neutral"|"negative", "confidence": number between 0 and 1}. No other text.',
//       },
//       { role: "user", content: state.query },
//     ],
//     { temperature: 0, jsonMode: true, maxTokens: 150 },
//   );

//   let parsed;
//   try {
//     parsed = JSON.parse(raw);
//   } catch {
//     parsed = { intent: "faq", sentiment: "neutral", confidence: 0.5 };
//   }

//   return {
//     ...state,
//     intent: parsed.intent,
//     sentiment: parsed.sentiment,
//     confidence: parsed.confidence,
//   };
// }

// // ---- Node: Tool Call (conditional on intent) ----
// async function toolCallNode(state) {
//   let toolResult = null;

//   if (state.intent === "order_status") {
//     const orderIdMatch = state.query.match(/#?\d{4,}/);
//     toolResult = await tools.check_order_status(
//       orderIdMatch ? orderIdMatch[0] : null,
//     );
//   } else if (state.intent === "refund") {
//     toolResult = await tools.get_refund_policy();
//   }

//   return { ...state, toolResult };
// }

// // ---- Node: Answer or Escalate ----
// async function answerOrEscalateNode(
//   state,
//   escalationThreshold = 0.55,
//   escalateOnNegative = true,
// ) {
//   const shouldEscalate =
//     state.intent === "human_request" ||
//     (state.intent === "complaint" && escalateOnNegative) ||
//     state.confidence < escalationThreshold;

//   if (shouldEscalate) {
//     return {
//       ...state,
//       escalate: true,
//       escalationReason:
//         state.intent === "human_request"
//           ? "Customer explicitly requested a human agent."
//           : state.intent === "complaint"
//             ? "Detected complaint/negative sentiment."
//             : "Low AI confidence in answering this query.",
//     };
//   }

//   const contextText = (state.retrievedChunks || [])
//     .map((c, i) => `[${i + 1}] ${c.text}`)
//     .join("\n\n");

//   const toolContext = state.toolResult
//     ? `\n\nTool result: ${JSON.stringify(state.toolResult)}`
//     : "";

//   const answer = await chatCompletion(
//     [
//       {
//         role: "system",
//         content: `${state.agentPersonality || "You are a friendly, concise customer support agent."}
// Answer the customer's question using ONLY the knowledge base context and tool results below. 
// If the context doesn't contain the answer, say you're not sure and offer to connect them with a human agent.
// Keep answers short (2-5 sentences), warm, and helpful. Do not make up policies or facts.

// Knowledge base context:
// ${contextText || "(no relevant context found)"}${toolContext}`,
//       },
//       { role: "user", content: state.query },
//     ],
//     { temperature: 0.4, maxTokens: 400 },
//   );

//   return { ...state, escalate: false, answer };
// }

// // ---- Node: Summarize (on handoff to human) ----
// async function summarizeNode(state) {
//   const transcript = (state.history || [])
//     .map((m) => `${m.sender}: ${m.text}`)
//     .concat([`customer: ${state.query}`])
//     .join("\n");

//   const summary = await chatCompletion(
//     [
//       {
//         role: "system",
//         content:
//           "You are an intent + sentiment classifier for a customer support system. " +
//           'Respond ONLY with strict JSON: {"intent": "faq"|"order_status"|"complaint"|"human_request"|"refund"|"greeting", ' +
//           '"sentiment": "positive"|"neutral"|"negative", "confidence": number between 0 and 1}. ' +
//           '"greeting" is for hellos, small talk, or thanks with no real support question - always give it confidence 0.9 or higher. No other text.',
//       },
//       { role: "user", content: transcript },
//     ],
//     { temperature: 0.3, maxTokens: 200 },
//   );

//   return { ...state, summary };
// }

// /**
//  * Runs the full agent graph for one customer message.
//  * @param {Object} input - { workspaceId, query, history, agentPersonality, escalationThreshold, escalateOnNegative }
//  */
// async function runAgentGraph(input) {
//   let state = { ...input };

//   state = await retrieveNode(state);
//   state = await classifyIntentNode(state);
//   state = await toolCallNode(state);
//   state = await answerOrEscalateNode(
//     state,
//     input.escalationThreshold,
//     input.escalateOnNegative,
//   );

//   if (state.escalate) {
//     state = await summarizeNode(state);
//   }

//   return state;
// }

// module.exports = {
//   runAgentGraph,
//   retrieveNode,
//   classifyIntentNode,
//   toolCallNode,
//   answerOrEscalateNode,
//   summarizeNode,
// };



const { chatCompletion } = require("../services/groqService");
const { retrieveRelevantChunks } = require("../services/vectorStore");
const { tools } = require("./tools");

// ---- Node: Retrieve ----
async function retrieveNode(state) {
  const chunks = await retrieveRelevantChunks(
    state.workspaceId,
    state.query,
    4,
  );
  return { ...state, retrievedChunks: chunks };
}

// ---- Node: Classify Intent ----
async function classifyIntentNode(state) {
  const raw = await chatCompletion(
    [
      {
        role: "system",
        content:
          "You are an intent + sentiment classifier for a customer support system. " +
          'Respond ONLY with strict JSON: {"intent": "faq"|"order_status"|"complaint"|"human_request"|"refund"|"greeting", ' +
          '"sentiment": "positive"|"neutral"|"negative", "confidence": number between 0 and 1}. ' +
          '"greeting" is for hellos, small talk, or thanks with no real support question - always give it confidence 0.9 or higher. No other text.',
      },
      { role: "user", content: state.query },
    ],
    { temperature: 0, jsonMode: true, maxTokens: 150 },
  );

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { intent: "faq", sentiment: "neutral", confidence: 0.5 };
  }

  return {
    ...state,
    intent: parsed.intent,
    sentiment: parsed.sentiment,
    confidence: parsed.confidence,
  };
}

// ---- Node: Tool Call (conditional on intent) ----
async function toolCallNode(state) {
  let toolResult = null;

  if (state.intent === "order_status") {
    const orderIdMatch = state.query.match(/#?\d{4,}/);
    toolResult = await tools.check_order_status(
      orderIdMatch ? orderIdMatch[0] : null,
    );
  } else if (state.intent === "refund") {
    toolResult = await tools.get_refund_policy();
  }

  return { ...state, toolResult };
}

// ---- Node: Answer or Escalate ----
async function answerOrEscalateNode(
  state,
  escalationThreshold = 0.55,
  escalateOnNegative = true,
) {
  const shouldEscalate =
    state.intent === "human_request" ||
    (state.intent === "complaint" && escalateOnNegative) ||
    state.confidence < escalationThreshold;

  console.log(
    `[agent] intent=${state.intent} confidence=${state.confidence} escalate=${shouldEscalate} query="${state.query}"`,
  );

  if (shouldEscalate) {
    return {
      ...state,
      escalate: true,
      escalationReason:
        state.intent === "human_request"
          ? "Customer explicitly requested a human agent."
          : state.intent === "complaint"
            ? "Detected complaint/negative sentiment."
            : "Low AI confidence in answering this query.",
    };
  }

  const contextText = (state.retrievedChunks || [])
    .map((c, i) => `[${i + 1}] ${c.text}`)
    .join("\n\n");

  const toolContext = state.toolResult
    ? `\n\nTool result: ${JSON.stringify(state.toolResult)}`
    : "";

  const answer = await chatCompletion(
    [
      {
        role: "system",
        content: `${state.agentPersonality || "You are a friendly, concise customer support agent."}
Answer the customer's question using ONLY the knowledge base context and tool results below. 
If the context doesn't contain the answer, say you're not sure and offer to connect them with a human agent.
Keep answers short (2-5 sentences), warm, and helpful. Do not make up policies or facts.

Knowledge base context:
${contextText || "(no relevant context found)"}${toolContext}`,
      },
      { role: "user", content: state.query },
    ],
    { temperature: 0.4, maxTokens: 400 },
  );

  return { ...state, escalate: false, answer };
}

// ---- Node: Summarize (on handoff to human) ----
async function summarizeNode(state) {
  const transcript = (state.history || [])
    .map((m) => `${m.sender}: ${m.text}`)
    .concat([`customer: ${state.query}`])
    .join("\n");

  const summary = await chatCompletion(
    [
      {
        role: "system",
        content:
          "Summarize this customer support conversation in 2-3 sentences for a human agent taking over. " +
          "Include the customer's core issue, what's been tried, and why it's being escalated.",
      },
      { role: "user", content: transcript },
    ],
    { temperature: 0.3, maxTokens: 200 },
  );

  return { ...state, summary };
}

/**
 * Runs the full agent graph for one customer message.
 * @param {Object} input - { workspaceId, query, history, agentPersonality, escalationThreshold, escalateOnNegative }
 */
async function runAgentGraph(input) {
  let state = { ...input };

  state = await retrieveNode(state);
  state = await classifyIntentNode(state);
  state = await toolCallNode(state);
  state = await answerOrEscalateNode(
    state,
    input.escalationThreshold,
    input.escalateOnNegative,
  );

  if (state.escalate) {
    state = await summarizeNode(state);
  }

  return state;
}

module.exports = {
  runAgentGraph,
  retrieveNode,
  classifyIntentNode,
  toolCallNode,
  answerOrEscalateNode,
  summarizeNode,
};