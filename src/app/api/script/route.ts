import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Initialize OpenAI client with Novita API configuration
const openai = new OpenAI({
  baseURL: "https://api.novita.ai/v3/openai",
  apiKey: process.env.NOVITA_API_KEY || "<Your API Key>", // Use environment variable
});

const model = "google/gemma-3-27b-it";

export const POST = async (req: NextRequest) => {
  try {
    const { prompt } = await req.json();
    
    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" }, 
        { status: 400 }
      );
    }

    console.log("Received prompt:", prompt);

    // Create chat completion
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: model,
      stream: false, // Set to true if you want streaming
      response_format: { type: "text" }
    });

    // Extract the response content
    const response = completion.choices[0]?.message?.content || "No response generated";

    return NextResponse.json({ 
      message: "Success",
      response: response,
      model: model
    });
    
  } catch (error) {
    console.error("API Error:", error);
    
    // Handle different types of errors
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: "An unexpected error occurred" }, 
      { status: 500 }
    );
  }
};
