const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve the data.json file
app.get('/data.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'data.json'));
});

// Serve the HTML file
app.get('*', (req, res) => {
    res.sendFile('loginResponsive.html', {root: 'public'});
  });

// Start the server
app.listen(3000, () => {
    console.log('Server is running on port 3000, http://localhost:3000/');
});
