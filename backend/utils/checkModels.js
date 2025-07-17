const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// List of latest models to check
const modelsToCheck = [
  // Latest Gemini 2.5 models
  "gemini-2.5-flash", 
  "gemini-2.5-pro",
  "gemini-2.5-flash-lite-preview-06-17",
  
  // Latest Gemini 2.0 models
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash-lite-001",
  
  // Latest Gemini 1.5 models (fallback)
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b-latest",
  "gemini-1.5-flash-8b"
];

async function checkModel(modelName) {
  try {
    console.log(`Testing model: ${modelName}...`);
    
    // Initialize the API with your API key
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: modelName });
    
    // Try a simple content generation to check if the model works
    const prompt = "Hello, are you available?";
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log(`✅ Model "${modelName}" is AVAILABLE and responded with:`);
    console.log(`-------------------`);
    console.log(text.substring(0, 100) + (text.length > 100 ? '...' : ''));
    console.log(`-------------------\n`);
    return true;
  } catch (error) {
    console.log(`❌ Model "${modelName}" is NOT AVAILABLE or had an error:`);
    console.log(`   ${error.message}`);
    if (error.status) {
      console.log(`   Status: ${error.status} ${error.statusText || ''}`);
    }
    console.log('');
    return false;
  }
}

async function checkAvailableModels() {
  console.log('Checking available Gemini models for your API key...\n');
  
  let availableModels = [];
  for (const modelName of modelsToCheck) {
    const isAvailable = await checkModel(modelName);
    if (isAvailable) {
      availableModels.push(modelName);
    }
  }
  
  console.log('\n=== SUMMARY ===');
  if (availableModels.length > 0) {
    console.log('Available models:');
    availableModels.forEach(model => console.log(`- ${model}`));
    
    console.log('\nTo use one of these models, update your AIService.js constructor:');
    console.log(`
    constructor() {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      this.model = this.genAI.getGenerativeModel({ model: "${availableModels[0]}" });
    }
    `);
  } else {
    console.log('No models are available with your current API key.');
    console.log('\nTroubleshooting tips:');
    console.log('1. Check if your API key is correct in your .env file');
    console.log('2. Verify that your API key has the necessary permissions');
    console.log('3. Make sure you have access to the Gemini API (https://ai.google.dev/)');
    console.log('4. Check if there are any quota limitations on your account');
    console.log('5. You might need to enable the Gemini API in your Google Cloud project');
  }
}

// Run the check
checkAvailableModels();
