# Ask Gemini - AI-Powered Q&A Application

A modern, full-stack web application that leverages Google's Gemini AI to provide intelligent answers to your questions.

## Features

- ✨ Clean, modern UI with Tailwind CSS
- 🚀 Fast, real-time AI responses
- 🔒 Secure API key handling
- 📱 Responsive design
- 💬 Interactive chat interface

## Tech Stack

- **Backend**: Node.js, Express.js
- **Frontend**: HTML, CSS (Tailwind), JavaScript
- **AI**: Google Gemini API (gemini-2.0-flash)
- **Deployment**: Vercel (backend)

## Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/saurya96/Geminii.git
   cd Geminii
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

4. **Run the development server**
   ```bash
   npm start
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## Environment Variables

- `GEMINI_API_KEY` - Your Google Gemini API key (required)
- `GEMINI_MODEL` - Model to use (default: gemini-2.0-flash)
- `GEMINI_PROVIDER` - Provider name (default: google)
- `MOCK_RESPONSE` - Use mock responses for testing (default: false)
- `PORT` - Server port (default: 3000)

## Project Structure

```
.
├── public/           # Frontend files
│   ├── index.html   # Landing page
│   ├── app.html     # Chat interface
│   ├── script.js    # Frontend logic
│   └── style.css    # Custom styles
├── server.js        # Express server
├── package.json     # Dependencies
├── .env             # Environment variables (not in git)
└── README.md        # This file
```

## API Endpoints

- `GET /` - Landing page
- `GET /app` - Chat interface
- `POST /ask` - Submit a question to Gemini
- `GET /health` - Health check
- `GET /diagnostics/gemini` - API diagnostics

## Deployment

The backend is deployed on Vercel at: https://geminii-8e7n.vercel.app

## License

MIT
