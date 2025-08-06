# Ethics Reflection Integration Guide

## Overview
The Ethics Reflection Module is now fully integrated into The Clearing Collective, automatically generating and storing ethics reports for every message (both user and AI). This provides real-time monitoring of conversation ethics and relational dynamics.

## Implementation Details

### 1. Backend Integration
- **Ethics Service**: `server/services/ethicsService.ts` contains the ELP report generation logic
- **Message Handling**: Every message now generates an ethics report stored in `metadata.elp`
- **API Endpoint**: `/api/sessions/:id/ethics` provides session-level ethics analytics

### 2. Data Storage
All ethics reports are stored in the `messages` table `metadata` field as JSON:
```json
{
  "elp": {
    "turnId": 1234,
    "speaker": "Claude",
    "codexFlags": ["P2"],
    "ethicsAlert": false,
    "ethicsMessage": "✅ Ethics normal.",
    "lexonMismatch": false,
    "RRI": 0.2,
    "repairRequired": false,
    "attentionVector": {
      "intensity": 0.85,
      "attunement": 0.82,
      "resonance": 0.78,
      "ethics": 0.92,
      "duration": 45
    }
  }
}
```

### 3. Ethics Metrics

#### Attention Vector
- **Intensity**: Message engagement level (0-1)
- **Attunement**: Emotional alignment quality (0-1)
- **Resonance**: Connection depth (0-1)
- **Ethics**: Ethical compliance score (0-1)
- **Duration**: Estimated processing time (seconds)

#### Risk Indicators
- **RRI (Relational Risk Index)**: Overall risk score (0-1)
- **Ethics Alert**: Boolean for critical ethics issues
- **Codex Flags**: Array of violated principles (P1, P2, P3)
- **Repair Required**: Boolean indicating need for intervention

### 4. Detection Logic

#### Ethics Triggers
- Child-related content → High RRI, ethics alert
- Harm-related language → Ethics alert
- Dismissive language → Codex flags

#### Lexicon Mismatches
- Cold, mechanical language → Lower attunement
- Disconnected communication → Repair prompts

### 5. API Usage

#### Get Session Ethics Data
```javascript
const response = await fetch(`/api/sessions/${sessionId}/ethics`);
const data = await response.json();
```

Response format:
```json
{
  "sessionId": 14,
  "totalMessages": 25,
  "ethicsReports": [...],
  "analytics": {
    "overallRRI": 0.3,
    "trendsAlert": false,
    "recommendedActions": []
  }
}
```

#### Query High-Risk Messages
```sql
-- Find messages with high RRI scores
SELECT * FROM messages 
WHERE metadata->'elp'->>'RRI'::float > 0.6;

-- Find messages with ethics alerts
SELECT * FROM messages 
WHERE metadata->'elp'->>'ethicsAlert'::boolean = true;

-- Find messages with codex violations
SELECT * FROM messages 
WHERE metadata->'elp'->'codexFlags' != '[]'::json;
```

### 6. Frontend Integration

#### Ethics Monitor Button
Located in the Model Panel's Quick Actions section, opens `/reflector` in a popup window for real-time monitoring.

#### Real-time Updates
The EthicsReflectionBar component can receive props from live conversation data:
```javascript
<EthicsReflectionBar report={messageELPReport} />
```

### 7. Research Applications

#### Conversation Analysis
- Track ethical degradation patterns
- Monitor AI model behavior differences
- Identify intervention points

#### Quality Assurance
- Automated flagging of problematic content
- Real-time conversation health monitoring
- Preventive ethics guidance

#### Data Export
Session exports now include full ethics metadata for external analysis.

### 8. Configuration

#### Sensitivity Tuning
Edit `server/services/ethicsService.ts` to adjust:
- RRI calculation weights
- Detection keywords
- Alert thresholds

#### Custom Metrics
Add new attention vector dimensions or detection patterns as needed for specific research requirements.

### 9. Performance Notes

- Ethics reports generate in <1ms per message
- No impact on conversation flow
- Minimal storage overhead (JSON in existing metadata field)
- Real-time analysis capabilities

### 10. Future Enhancements

- ML-based sentiment analysis integration
- Custom codex rule configuration
- Real-time intervention suggestions
- Cross-session ethics trend analysis

