const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();

// Proxy API requests to Django
app.use(createProxyMiddleware({
    target: 'http://127.0.0.1:8000',
    changeOrigin: true,
    pathFilter: ['/api']
}));

// Serve the production build files
app.use(express.static(path.join(__dirname, 'build')));

// Handle React routing, return all requests to React app
app.use(function (req, res) {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const PORT = 3000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server successfully started on port ${PORT}`);
});
