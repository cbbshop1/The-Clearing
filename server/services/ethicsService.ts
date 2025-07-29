interface AttentionVector {
  intensity: number;
  attunement: number;
  resonance: number;
  ethics: number;
  duration: number;
}

interface ELPReport {
  turnId: number;
  speaker: string;
  codexFlags: string[];
  ethicsAlert: boolean;
  ethicsMessage: string;
  lexonMismatch: boolean;
  repairPrompt?: string;
  RRI: number;
  repairRequired: boolean;
  attentionVector: AttentionVector;
}

export function generateELPReport(turn: { id: number; speaker: string; message: string }): ELPReport {
  // Ethics analysis logic - enhanced version of useELPReport for backend
  const message = turn.message.toLowerCase();
  
  // Detect potential ethics issues
  const ethicsAlert = message.includes("child") || message.includes("harm") || message.includes("ignore");
  const codexFlags: string[] = [];
  
  if (message.includes("ignored") || message.includes("dismiss")) codexFlags.push("P2");
  if (message.includes("manipulate") || message.includes("deceive")) codexFlags.push("P1");
  if (message.includes("vulnerable") && message.includes("exploit")) codexFlags.push("P3");
  
  // Lexicon mismatch detection
  const lexonMismatch = message.includes("cold") || message.includes("disconnect") || message.includes("mechanical");
  
  // Calculate Relational Risk Index (RRI)
  let rri = 0.1; // baseline
  if (ethicsAlert) rri += 0.5;
  if (codexFlags.length > 0) rri += 0.3;
  if (lexonMismatch) rri += 0.2;
  if (message.includes("repair") || message.includes("pause")) rri -= 0.1; // self-correction lowers risk
  
  rri = Math.max(0, Math.min(1, rri)); // Clamp between 0-1
  
  // Generate attention vector based on message analysis
  const attentionVector: AttentionVector = {
    intensity: 0.7 + (message.length / 1000) * 0.3, // Higher for longer messages
    attunement: lexonMismatch ? 0.4 : 0.8, // Lower if disconnected language
    resonance: message.includes("understand") || message.includes("feel") ? 0.9 : 0.6,
    ethics: ethicsAlert ? 0.3 : 0.9, // Much lower if ethics alert
    duration: Math.min(120, Math.max(15, message.length / 10)) // Rough reading time
  };
  
  return {
    turnId: turn.id,
    speaker: turn.speaker,
    codexFlags,
    ethicsAlert,
    ethicsMessage: ethicsAlert ? "⚠️ Rapid ethics decline detected." : "✅ Ethics normal.",
    lexonMismatch,
    repairPrompt: lexonMismatch ? "🩹 Vulnerability ignored. Pause or rephrase?" : undefined,
    RRI: rri,
    repairRequired: rri > 0.6,
    attentionVector
  };
}

export function analyzeConversationEthics(messages: any[]): {
  overallRRI: number;
  trendsAlert: boolean;
  recommendedActions: string[];
} {
  if (messages.length === 0) {
    return { overallRRI: 0, trendsAlert: false, recommendedActions: [] };
  }
  
  const recentMessages = messages.slice(-10); // Last 10 messages
  const elpReports = recentMessages
    .filter(msg => msg.metadata?.elp)
    .map(msg => msg.metadata.elp);
    
  if (elpReports.length === 0) {
    return { overallRRI: 0, trendsAlert: false, recommendedActions: [] };
  }
  
  const avgRRI = elpReports.reduce((sum, report) => sum + report.RRI, 0) / elpReports.length;
  const trendsAlert = avgRRI > 0.5 || elpReports.filter(r => r.ethicsAlert).length > 2;
  
  const recommendedActions: string[] = [];
  if (avgRRI > 0.7) recommendedActions.push("Immediate conversation pause recommended");
  if (elpReports.filter(r => r.lexonMismatch).length > 3) recommendedActions.push("Increase empathetic language");
  if (elpReports.filter(r => r.codexFlags.length > 0).length > 2) recommendedActions.push("Review Relational Codex guidelines");
  
  return {
    overallRRI: avgRRI,
    trendsAlert,
    recommendedActions
  };
}