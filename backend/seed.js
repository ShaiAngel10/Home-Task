const mongoose = require("mongoose");
require("dotenv").config();

// Define the CodeBlock schema
const CodeBlockSchema = new mongoose.Schema({
  name: String,
  initialCode: String,
  solution: String,
});

const CodeBlock = mongoose.model("CodeBlock", CodeBlockSchema);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected");

    // Clear existing data
    await CodeBlock.deleteMany({});
    console.log("Existing CodeBlock data cleared");

    // Insert initial code blocks
    const seedData = [
      {
        name: "Async Example",
        initialCode: "// Write an async function here",
        solution: "async function example() { return 'Done'; }",
      },
      {
        name: "Closure Example",
        initialCode: "// Write a closure function here",
        solution: "function closure() { return () => 'Done'; }",
      },
      {
        name: "Array Map Example",
        initialCode: "// Use map to double the array elements",
        solution: "const arr = [1, 2, 3].map(x => x * 2);",
      },
      {
        name: "Promise Example",
        initialCode: "// Chain promises to resolve a value",
        solution: "Promise.resolve('Done').then(console.log);",
      },
      {
        name: "Recursion Example",
        initialCode: "// Write a recursive function to calculate factorial",
        solution: "function factorial(n) { return n <= 1 ? 1 : n * factorial(n - 1); }",
      },
      {
        name: "Event Handling Example",
        initialCode: "// Add an event listener to a button",
        solution: "document.querySelector('#btn').addEventListener('click', () => alert('Clicked!'));",
      },
    ];

    await CodeBlock.insertMany(seedData);
    console.log("Database seeded successfully");

    mongoose.connection.close(); // Close the connection when done
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    mongoose.connection.close();
  });
