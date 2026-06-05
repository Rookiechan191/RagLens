# RagLens 🔍

**RagLens** is a full-stack RAG (Retrieval-Augmented Generation) application that enables you to upload PDF documents and ask questions about their content using AI. It combines efficient document retrieval with large language models to provide accurate, context-aware answers.

---

## 🌟 Features

- **PDF Upload & Indexing**: Seamlessly upload PDF documents for instant indexing and analysis
- **Intelligent Retrieval**: Uses semantic search with embeddings to find the most relevant document chunks
- **Streaming Responses**: Real-time streaming of AI-generated answers as they're being produced
- **Fast API Backend**: Built with FastAPI for high performance and automatic OpenAPI documentation
- **Modern UI**: React + Vite frontend with responsive design
- **RAG Architecture**: Combines document retrieval with LLM capabilities for accurate, grounded responses

---

## 🏗️ Architecture

```
RagLens
├── frontend/          # React + Vite web application
│   ├── src/          # React components and utilities
│   └── package.json  # Frontend dependencies
├── backend/          # FastAPI Python backend
│   ├── app/          # Core application logic
│   └── requirements.txt
└── README.md
```

### Technology Stack

**Backend:**
- **Framework**: FastAPI (Python)
- **LLM**: Groq API (Llama 3 8B)
- **Embeddings**: FastEmbed
- **Vector Database**: ChromaDB
- **PDF Processing**: PyPDF
- **Server**: Uvicorn

**Frontend:**
- **Framework**: React 19
- **Build Tool**: Vite
- **Linting**: ESLint

---

## 📋 Prerequisites

Before getting started, ensure you have the following installed:

- **Python 3.9+** (for backend)
- **Node.js 16+** (for frontend)
- **npm or yarn** (for package management)
- **Groq API Key** (get it from [console.groq.com](https://console.groq.com))

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Rookiechan191/RagLens.git
cd RagLens
```

### 2. Set Up Environment Variables

Create a `.env` file in the `backend` directory:

```bash
cd backend
echo "GROQ_API_KEY=your_groq_api_key_here" > .env
```

**Optional environment variables:**
- `ALLOWED_ORIGINS`: CORS allowed origins (default: `*`, use comma-separated values for production)
- `GROQ_API_KEY`: Your Groq API key (required)

### 3. Set Up the Backend

```bash
cd backend

# Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn app.main:app --reload --port 8000
```

The backend API will be available at `http://localhost:8000`
- API Documentation: `http://localhost:8000/docs`

### 4. Set Up the Frontend

In a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

---

## 📖 Usage

### Upload a PDF Document

1. Open the frontend application in your browser
2. Upload a PDF document through the UI
3. The document will be processed and indexed automatically
4. The system will extract text and create embeddings for semantic search

### Ask Questions

1. Once a document is uploaded, type your question in the query field
2. The system will:
   - Embed your question
   - Retrieve the most relevant chunks (top-k documents)
   - Generate an answer using the LLM based on the retrieved context
3. Answers stream in real-time as they're being generated

### API Endpoints

#### Health Check
```http
GET /health
```

#### Upload PDF
```http
POST /upload
Content-Type: multipart/form-data

file: <PDF file>
```

**Response:**
```json
{
  "message": "Ingested successfully.",
  "filename": "document.pdf",
  "pages": 10,
  "chunks": 45
}
```

#### Query Document
```http
POST /query
Content-Type: application/json

{
  "question": "What is the main topic of the document?",
  "top_k": 3
}
```

**Response:**
- Streamed text/plain response with the AI-generated answer

---

## 🔧 Project Structure

### Backend (`backend/app/`)

- **`main.py`**: FastAPI application with route handlers
  - `/upload`: Accepts PDF files and ingests them
  - `/query`: Accepts questions and returns streaming responses

- **`ingest.py`**: PDF processing pipeline
  - Reads PDF files
  - Extracts text content
  - Splits text into chunks
  - Generates embeddings
  - Stores in ChromaDB

- **`retriever.py`**: Retrieval logic
  - Embeds query text
  - Searches ChromaDB for similar chunks
  - Formats retrieved context for the LLM

- **`llm.py`**: LLM integration
  - Manages Groq API client
  - Streams responses from the LLM
  - Formats prompts with system instructions

### Frontend (`frontend/src/`)

- **`App.jsx`**: Main React component
- **`App.css`**: Application styling
- **`api.js`**: API client for backend communication
- **`main.jsx`**: React DOM entry point
- **`index.css`**: Global styles

---

## 🛠️ Development

### Running Tests

**Frontend:**
```bash
cd frontend
npm run lint
```

**Backend:**
```bash
cd backend
# Run linting and type checks as needed
python -m pytest  # if tests are added
```

### Building for Production

**Frontend:**
```bash
cd frontend
npm run build
```

**Backend:**
Ensure your `.env` file has the correct `GROQ_API_KEY` and deploy using your preferred hosting service (Docker, Vercel, Railway, etc.)

### Docker Deployment (Backend)

A `Dockerfile` is included in the backend directory. Build and run:

```bash
cd backend
docker build -t raglens-backend .
docker run -p 8000:8000 -e GROQ_API_KEY=your_key raglens-backend
```

---

## 📝 How It Works

### RAG Pipeline

1. **Document Ingestion**:
   - PDF is uploaded and validated
   - Text is extracted using PyPDF
   - Text is split into semantic chunks
   - Chunks are embedded using FastEmbed

2. **Storage**:
   - Embeddings are stored in ChromaDB
   - ChromaDB indexes vectors for fast retrieval

3. **Query Processing**:
   - User question is embedded using the same embedding model
   - Similar chunks are retrieved from ChromaDB (top-k)
   - Retrieved chunks are formatted with the user question
   - Groq's Llama 3 model generates an answer based on the context

4. **Response Streaming**:
   - The backend streams response tokens in real-time
   - The frontend displays tokens as they arrive for a smooth UX

---

## 🔐 Security Considerations

- **API Keys**: Keep your `GROQ_API_KEY` secure and never commit it to version control
- **CORS**: Adjust `ALLOWED_ORIGINS` in production to your actual domain
- **File Uploads**: Only PDF files are accepted; validation is enforced
- **Input Validation**: All inputs are validated with Pydantic models
- **Error Handling**: Sensitive error details are not exposed to clients

---

## 🐛 Troubleshooting

### Backend won't start
- Ensure Python 3.9+ is installed
- Verify all dependencies are installed: `pip install -r requirements.txt`
- Check that `GROQ_API_KEY` is set in `.env`

### Frontend build fails
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Ensure Node.js 16+ is installed

### PDF upload fails
- Verify the file is a valid PDF
- Check that the file size isn't too large
- Ensure the backend is running and accessible

### Empty responses from queries
- Verify a document has been uploaded
- Check that the question is relevant to the document
- Ensure `GROQ_API_KEY` is valid and has quota

---

## 📚 Dependencies

### Backend
See `backend/requirements.txt` for complete list:
- `fastapi==0.111.0`: Modern web framework
- `uvicorn[standard]==0.29.0`: ASGI server
- `python-multipart==0.0.9`: Form data handling
- `pypdf==4.2.0`: PDF processing
- `fastembed==0.3.1`: Fast embeddings
- `chromadb==0.5.0`: Vector database
- `groq`: Groq API client
- `pydantic==2.7.1`: Data validation

### Frontend
See `frontend/package.json` for complete list:
- `react@^19.2.6`: React framework
- `react-dom@^19.2.6`: React DOM
- `vite@^8.0.12`: Build tool
- `eslint@^10.3.0`: Code linting

---

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Submit a pull request

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 📞 Support

For issues, questions, or suggestions, please open an issue on the [GitHub repository](https://github.com/Rookiechan191/RagLens/issues).

---

## 🎯 Future Enhancements

Potential improvements for future versions:

- [ ] Support for multiple file types (DOCX, TXT, Markdown)
- [ ] Document management interface (view, edit, delete)
- [ ] User authentication and document ownership
- [ ] Chat history and conversation management
- [ ] Advanced query filters and metadata search
- [ ] Customizable embedding models
- [ ] Batch document processing
- [ ] Performance metrics and analytics
- [ ] Web scraping for URL content indexing
- [ ] Multi-language support

---

**Happy questioning! 🚀**