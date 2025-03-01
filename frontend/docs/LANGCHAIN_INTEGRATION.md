# LangChain Integration Guide

## Overview
This document provides detailed guidance on integrating LangChain into the Cooking Assistant App. LangChain will be used for processing video transcripts, extracting recipe information, and powering the conversational voice agent.

## Setup and Installation

### Dependencies
Add the following dependencies to your project:

```bash
npm install langchain @langchain/openai @langchain/anthropic @langchain/community
```

### Environment Configuration
Create a `.env` file with the necessary API keys:

```
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### Basic Configuration
Create a configuration file for LangChain:

```typescript
// src/config/langchain.ts
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";

export const getOpenAIModel = (options = {}) => {
  return new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0.2,
    ...options,
  });
};

export const getAnthropicModel = (options = {}) => {
  return new ChatAnthropic({
    modelName: "claude-3-opus-20240229",
    temperature: 0.2,
    ...options,
  });
};

export const defaultModel = getOpenAIModel();
```

## Core Components

### 1. Recipe Extraction Chain

This chain processes video transcripts to extract structured recipe information:

```typescript
// src/services/recipe-extraction.ts
import { PromptTemplate } from "@langchain/core/prompts";
import { LLMChain } from "langchain/chains";
import { defaultModel } from "../config/langchain";
import { StructuredOutputParser } from "langchain/output_parsers";

// Define the recipe schema
const recipeParser = StructuredOutputParser.fromZodSchema(z.object({
  title: z.string().describe("The title of the recipe"),
  description: z.string().describe("A brief description of the dish"),
  ingredients: z.array(z.object({
    name: z.string().describe("Ingredient name"),
    quantity: z.string().optional().describe("Amount needed"),
    unit: z.string().optional().describe("Unit of measurement"),
    notes: z.string().optional().describe("Additional notes about the ingredient")
  })).describe("List of ingredients needed"),
  steps: z.array(z.string()).describe("Step-by-step cooking instructions"),
  prepTime: z.string().optional().describe("Preparation time"),
  cookTime: z.string().optional().describe("Cooking time"),
  totalTime: z.string().optional().describe("Total time"),
  servings: z.string().optional().describe("Number of servings"),
  difficulty: z.string().optional().describe("Recipe difficulty level"),
  tips: z.array(z.string()).optional().describe("Cooking tips mentioned in the video")
}));

// Create the prompt template
const recipeExtractionPrompt = PromptTemplate.fromTemplate(`
You are a professional chef and recipe analyzer. Extract a detailed, structured recipe from the following video transcript:

{transcript}

${recipeParser.getFormatInstructions()}

If certain information is not explicitly mentioned in the transcript, make reasonable inferences based on similar recipes, but mark these as inferred.
Focus on accuracy for ingredients and steps.
`);

// Create the chain
export const createRecipeExtractionChain = (model = defaultModel) => {
  return new LLMChain({
    llm: model,
    prompt: recipeExtractionPrompt,
    outputParser: recipeParser,
  });
};

// Usage function
export const extractRecipeFromTranscript = async (transcript: string) => {
  const chain = createRecipeExtractionChain();
  const result = await chain.call({ transcript });
  return result.text;
};
```

### 2. Conversational Agent

This component powers the voice interaction:

```typescript
// src/services/voice-agent.ts
import { ConversationChain } from "langchain/chains";
import { BufferMemory } from "langchain/memory";
import { PromptTemplate } from "@langchain/core/prompts";
import { defaultModel } from "../config/langchain";

// Create the prompt template for the cooking assistant
const cookingAssistantPrompt = PromptTemplate.fromTemplate(`
You are a helpful cooking assistant guiding a user through a recipe. You have access to the full recipe details and the user's current progress.

Current Recipe: {recipe}
Current Step: {currentStep} of {totalSteps}
User's Progress: {progress}

Previous conversation:
{chat_history}

User: {input}
Assistant:`);

// Create the conversation chain
export const createCookingAssistantChain = (recipe, model = defaultModel) => {
  const memory = new BufferMemory({ returnMessages: true, memoryKey: "chat_history" });
  
  return new ConversationChain({
    llm: model,
    prompt: cookingAssistantPrompt,
    memory,
    verbose: true,
  });
};

// Session manager for the cooking assistant
export class CookingSession {
  private recipe: any;
  private currentStep: number = 0;
  private chain: ConversationChain;
  private progress: string[] = [];
  
  constructor(recipe) {
    this.recipe = recipe;
    this.chain = createCookingAssistantChain(recipe);
  }
  
  async processUserInput(input: string) {
    // Process user input and generate response
    const response = await this.chain.call({
      input,
      recipe: JSON.stringify(this.recipe),
      currentStep: this.currentStep + 1,
      totalSteps: this.recipe.steps.length,
      progress: this.progress.join(", "),
    });
    
    // Check for step navigation commands
    if (input.toLowerCase().includes("next step")) {
      this.advanceStep();
    } else if (input.toLowerCase().includes("previous step")) {
      this.goToPreviousStep();
    }
    
    return response.response;
  }
  
  getCurrentStep() {
    return this.recipe.steps[this.currentStep];
  }
  
  advanceStep() {
    if (this.currentStep < this.recipe.steps.length - 1) {
      this.progress.push(`Completed step ${this.currentStep + 1}`);
      this.currentStep++;
      return true;
    }
    return false;
  }
  
  goToPreviousStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.progress.pop();
      return true;
    }
    return false;
  }
  
  getProgress() {
    return {
      currentStep: this.currentStep + 1,
      totalSteps: this.recipe.steps.length,
      completedSteps: this.progress.length,
    };
  }
}
```

### 3. Video Analysis Chain

This chain analyzes video content to extract relevant information:

```typescript
// src/services/video-analysis.ts
import { PromptTemplate } from "@langchain/core/prompts";
import { LLMChain } from "langchain/chains";
import { defaultModel } from "../config/langchain";

// Create the prompt template for video analysis
const videoAnalysisPrompt = PromptTemplate.fromTemplate(`
Analyze the following cooking video information:

Title: {title}
Description: {description}
Transcript: {transcript}

Extract the following information:
1. What dish is being prepared?
2. What is the cooking style or cuisine?
3. What are the key techniques demonstrated?
4. Are there any special equipment requirements?
5. What is the approximate difficulty level?
6. Are there any unique ingredients or substitutions mentioned?
7. What are the main flavor profiles?

Provide a concise summary that would help someone decide if they want to cook this recipe.
`);

// Create the video analysis chain
export const createVideoAnalysisChain = (model = defaultModel) => {
  return new LLMChain({
    llm: model,
    prompt: videoAnalysisPrompt,
  });
};

// Usage function
export const analyzeVideoContent = async (videoData) => {
  const { title, description, transcript } = videoData;
  const chain = createVideoAnalysisChain();
  const result = await chain.call({ title, description, transcript });
  return result.text;
};
```

## Advanced Features

### 1. Streaming Responses

For more responsive voice interactions, implement streaming:

```typescript
// src/services/streaming-voice.ts
import { ChatOpenAI } from "@langchain/openai";

export const getStreamingModel = () => {
  return new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0.2,
    streaming: true,
  });
};

export const streamingCookingAssistant = async (
  input: string,
  recipe: any,
  currentStep: number,
  onToken: (token: string) => void
) => {
  const model = getStreamingModel();
  
  const prompt = `
  You are a helpful cooking assistant guiding a user through a recipe.
  
  Current Recipe: ${JSON.stringify(recipe)}
  Current Step: ${currentStep + 1} of ${recipe.steps.length}
  
  User: ${input}
  Assistant:`;
  
  const controller = new AbortController();
  
  await model.call(prompt, {
    signal: controller.signal,
    callbacks: [
      {
        handleLLMNewToken(token) {
          onToken(token);
        },
      },
    ],
  });
  
  return controller; // Return controller to allow abortion if needed
};
```

### 2. Tool Use with LangChain

Implement tools to enhance the cooking assistant:

```typescript
// src/services/cooking-tools.ts
import { Tool } from "langchain/tools";
import { initializeAgentExecutorWithOptions } from "langchain/agents";
import { defaultModel } from "../config/langchain";

// Create a timer tool
class TimerTool extends Tool {
  name = "timer";
  description = "Set a timer for a specific duration in minutes";
  
  async _call(input: string) {
    const minutes = parseInt(input.trim());
    if (isNaN(minutes)) {
      return "Please provide a valid number of minutes.";
    }
    
    // In a real implementation, this would set an actual timer
    return `Timer set for ${minutes} minutes.`;
  }
}

// Create a conversion tool
class ConversionTool extends Tool {
  name = "convert_measurement";
  description = "Convert between different units of measurement. Input should be like '2 cups to ml'";
  
  async _call(input: string) {
    // Simple conversion logic (would be more comprehensive in production)
    const match = input.match(/(\d+)\s+(\w+)\s+to\s+(\w+)/i);
    if (!match) {
      return "Please provide input in the format '2 cups to ml'";
    }
    
    const [_, amount, fromUnit, toUnit] = match;
    const conversions = {
      "cups_to_ml": 236.588,
      "tbsp_to_ml": 14.787,
      "tsp_to_ml": 4.929,
      // Add more conversions as needed
    };
    
    const key = `${fromUnit.toLowerCase()}_to_${toUnit.toLowerCase()}`;
    if (conversions[key]) {
      const result = parseFloat(amount) * conversions[key];
      return `${amount} ${fromUnit} is approximately ${result.toFixed(1)} ${toUnit}`;
    }
    
    return "Sorry, I don't know how to convert between those units.";
  }
}

// Create a substitution tool
class IngredientSubstitutionTool extends Tool {
  name = "ingredient_substitution";
  description = "Find substitutes for ingredients. Input should be the ingredient name.";
  
  async _call(input: string) {
    // In production, this would query a database of substitutions
    const substitutions = {
      "butter": "margarine, olive oil, coconut oil, or applesauce",
      "eggs": "flax eggs (1 tbsp ground flaxseed + 3 tbsp water), applesauce, or banana",
      "milk": "almond milk, soy milk, oat milk, or coconut milk",
      // Add more substitutions as needed
    };
    
    const ingredient = input.trim().toLowerCase();
    return substitutions[ingredient] || 
      "I don't have specific substitution information for that ingredient.";
  }
}

// Create the cooking agent
export const createCookingAgent = async () => {
  const tools = [
    new TimerTool(),
    new ConversionTool(),
    new IngredientSubstitutionTool(),
  ];
  
  const executor = await initializeAgentExecutorWithOptions(
    tools,
    defaultModel,
    {
      agentType: "chat-conversational-react-description",
      verbose: true,
    }
  );
  
  return executor;
};

// Usage
export const askCookingAgent = async (input: string) => {
  const agent = await createCookingAgent();
  const result = await agent.call({ input });
  return result.output;
};
```

## Integration with Mobile App

### Frontend Integration

```typescript
// src/services/recipe-service.ts
import { extractRecipeFromTranscript } from './recipe-extraction';
import { CookingSession } from './voice-agent';
import { analyzeVideoContent } from './video-analysis';

export class RecipeService {
  private static instance: RecipeService;
  private activeSessions: Map<string, CookingSession> = new Map();
  
  static getInstance() {
    if (!RecipeService.instance) {
      RecipeService.instance = new RecipeService();
    }
    return RecipeService.instance;
  }
  
  async processVideoUrl(url: string) {
    try {
      // 1. Extract video content (implementation depends on platform)
      const videoData = await this.extractVideoContent(url);
      
      // 2. Analyze video content
      const analysis = await analyzeVideoContent(videoData);
      
      // 3. Extract recipe from transcript
      const recipe = await extractRecipeFromTranscript(videoData.transcript);
      
      // 4. Store the processed recipe
      const sessionId = this.generateSessionId();
      const session = new CookingSession(recipe);
      this.activeSessions.set(sessionId, session);
      
      return {
        sessionId,
        recipe,
        analysis,
      };
    } catch (error) {
      console.error('Error processing video URL:', error);
      throw new Error('Failed to process video URL');
    }
  }
  
  async handleUserInput(sessionId: string, input: string) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    return await session.processUserInput(input);
  }
  
  getSessionProgress(sessionId: string) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    return session.getProgress();
  }
  
  getCurrentStep(sessionId: string) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    return session.getCurrentStep();
  }
  
  private async extractVideoContent(url: string) {
    // Implementation depends on the video platform (YouTube, TikTok)
    // This would call platform-specific services
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return await this.extractYouTubeContent(url);
    } else if (url.includes('tiktok.com')) {
      return await this.extractTikTokContent(url);
    } else {
      throw new Error('Unsupported video platform');
    }
  }
  
  private async extractYouTubeContent(url: string) {
    // Implementation for YouTube content extraction
    // This would use YouTube API or a scraping service
    // For now, return mock data
    return {
      title: 'Sample YouTube Recipe',
      description: 'This is a sample recipe video description',
      transcript: 'This is a sample transcript of the cooking instructions...',
    };
  }
  
  private async extractTikTokContent(url: string) {
    // Implementation for TikTok content extraction
    // This would use a scraping service
    // For now, return mock data
    return {
      title: 'Sample TikTok Recipe',
      description: 'This is a sample recipe video description',
      transcript: 'This is a sample transcript of the cooking instructions...',
    };
  }
  
  private generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

## Best Practices

### 1. Prompt Engineering

- **Be Specific**: Clearly define the expected output format
- **Provide Examples**: Include examples in prompts for complex tasks
- **Use System Messages**: Set clear roles and expectations
- **Iterate**: Continuously refine prompts based on output quality

### 2. Error Handling

- Implement robust error handling for LLM calls
- Add retry logic with exponential backoff
- Validate LLM outputs against expected schemas
- Have fallback responses for when LLM services are unavailable

### 3. Performance Optimization

- Cache common LLM responses
- Use streaming for long responses
- Implement request batching when appropriate
- Consider using smaller models for simpler tasks

### 4. Cost Management

- Monitor token usage
- Implement rate limiting
- Use caching to reduce redundant calls
- Consider local models for certain tasks

## Testing LangChain Components

```typescript
// src/tests/recipe-extraction.test.ts
import { extractRecipeFromTranscript } from '../services/recipe-extraction';

describe('Recipe Extraction', () => {
  test('should extract recipe from transcript', async () => {
    const mockTranscript = `
      Today we're making chocolate chip cookies. You'll need:
      - 2 cups of flour
      - 1 cup of butter
      - 1 cup of chocolate chips
      - 1/2 cup of sugar
      
      First, mix the butter and sugar. Then add the flour and chocolate chips.
      Bake at 350 degrees for 10 minutes.
    `;
    
    const result = await extractRecipeFromTranscript(mockTranscript);
    
    expect(result).toHaveProperty('title');
    expect(result).toHaveProperty('ingredients');
    expect(result).toHaveProperty('steps');
    expect(result.ingredients.length).toBeGreaterThan(0);
    expect(result.steps.length).toBeGreaterThan(0);
  });
});
```

## Troubleshooting

### Common Issues and Solutions

1. **Inconsistent LLM Responses**
   - Reduce temperature parameter
   - Use more specific prompts
   - Implement output validation

2. **High Latency**
   - Use streaming responses
   - Implement caching
   - Consider smaller models for time-sensitive tasks

3. **Context Length Limitations**
   - Summarize long transcripts
   - Split processing into multiple steps
   - Use models with longer context windows

4. **API Rate Limits**
   - Implement queuing
   - Add retry logic with backoff
   - Monitor usage and adjust request patterns

## Resources

- [LangChain Documentation](https://js.langchain.com/docs/)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Anthropic API Reference](https://docs.anthropic.com/claude/reference)
- [Prompt Engineering Guide](https://www.promptingguide.ai/) 