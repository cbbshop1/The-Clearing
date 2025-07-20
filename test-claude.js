// Quick test to verify Claude API is working
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function testClaude() {
  try {
    console.log('Testing Claude API...');
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 100,
      messages: [{
        role: "user",
        content: "Hello, can you say hello back to test if you're working?"
      }]
    });
    
    console.log('✅ Claude response:', response.content[0].text);
  } catch (error) {
    console.error('❌ Claude error:', error.message);
  }
}

testClaude();