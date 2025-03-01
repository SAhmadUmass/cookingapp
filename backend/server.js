const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Define routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the cooking app' });
});

// API routes
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello, World!' });
});

// Sample data for a cooking app
const recipes = [
  { id: 1, name: 'Pasta Carbonara', ingredients: ['pasta', 'eggs', 'cheese', 'bacon'], cookingTime: 30 },
  { id: 2, name: 'Chicken Curry', ingredients: ['chicken', 'curry paste', 'coconut milk', 'rice'], cookingTime: 45 },
  { id: 3, name: 'Vegetable Stir Fry', ingredients: ['mixed vegetables', 'soy sauce', 'ginger', 'garlic'], cookingTime: 20 }
];

// Get all recipes
app.get('/api/recipes', (req, res) => {
  res.json(recipes);
});

// Get recipe by ID
app.get('/api/recipes/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const recipe = recipes.find(r => r.id === id);
  
  if (!recipe) {
    return res.status(404).json({ message: 'Recipe not found' });
  }
  
  res.json(recipe);
});

// Set port and start server
const PORT = process.env.PORT ||  8080;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
}); 