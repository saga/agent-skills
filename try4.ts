import { CopilotClient, defineTool } from "@github/copilot-sdk";
import * as readline from "readline";

const getWeather = defineTool("get_weather", {
    description: "Get the current weather for a city",
    parameters: {
        type: "object",
        properties: {
            city: { type: "string", description: "The city name" },
        },
        required: ["city"],
    },
    handler: async ({ city }) => {
        const conditions = ["sunny", "cloudy", "rainy", "partly cloudy"];
        const temp = Math.floor(Math.random() * 30) + 50;
        const condition = conditions[Math.floor(Math.random() * conditions.length)];
        return { city, temperature: `${temp}°F`, condition };
    },
});

const client = new CopilotClient();
const session = await client.createSession({
    systemMessage: {
        content: "You are a helpful assistant for our engineering team. Always be concise.",
    },
    model: "gpt-4.1",
    streaming: true,
    tools: [getWeather],
    customAgents: [{
        name: "pr-reviewer",
        displayName: "PR Reviewer",
        description: "Reviews pull requests for best practices",
        prompt: "You are an expert code reviewer. Focus on security, performance, and maintainability.",
    }],
    // https://github.com/github/copilot-sdk/blob/main/docs/mcp/overview.md
    mcpServers: {
        "github": {
            type: "http",
            url: "https://api.githubcopilot.com/mcp/",
            headers: { "Authorization": "Bearer ${TOKEN}" },
            tools: ["*"],
        },
    },
});

session.on("assistant.message_delta", (event) => {
    process.stdout.write(event.data.deltaContent);
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

console.log("🌤️  Weather Assistant (type 'exit' to quit)");
console.log("   Try: 'What's the weather in Paris?'\n");

const prompt = () => {
    rl.question("You: ", async (input) => {
        if (input.toLowerCase() === "exit") {
            await client.stop();
            rl.close();
            return;
        }

        process.stdout.write("Assistant: ");
        await session.sendAndWait({ prompt: input });
        console.log("\n");
        prompt();
    });
};

prompt();