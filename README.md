# 🎬 YT Summarizer

AI-powered YouTube video summarizer and knowledge manager.
**Turn hours of video content into structured, high-quality learning materials.**

## ✨ Features

-   **🤖 Deep AI Summaries**: Uses **Gemini 2.0 Flash** to generate multi-pass, structured summaries.
-   **📚 Knowledge Management**: Automatically organizes summaries by channel and playlist.
-   **📝 Markdown Export**: Export your summaries to Markdown for notes apps like Obsidian.
-   **🐳 Docker Support**: Run the entire stack with a single command.
-   **⚡ High Performance**: Caches transcripts and summaries for instant access.
-   **🔍 Smart Search**: (Planned) Search through your entire video knowledge base.
-   **🎯 Playlist Management**: Easily import and organize your YouTube playlists.

## 🛠️ Tech Stack

-   **Frontend**: [Next.js 15](https://nextjs.org/) (App Router), [Tailwind CSS](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/)
-   **Auth**: [NextAuth.js v5](https://authjs.dev/) (Google OAuth)
-   **AI**: [Google Gemini 2.0 Flash](https://deepmind.google/technologies/gemini/)
-   **Database**: SQLite with [Prisma](https://www.prisma.io/)
-   **Transcripts**: `youtube-transcript-plus` (Node.js)

## 🚀 Getting Started

### Prerequisites

-   **Node.js** (v18 or higher)
-   **Docker** (Optional, for containerized deployment)
-   **Google Cloud Console Account** (for OAuth credentials)
-   **Google AI Studio Key** (for Gemini API)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/yt-summarizer.git
    cd yt-summarizer
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    Copy the example `.env` file and fill in your keys.
    ```bash
    cp .env.example .env.local
    ```
    
    Edit `.env.local` with your values:
    -   `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: From Google Cloud Console.
    -   `GOOGLE_AI_KEY`: Your Gemini API key.
    -   `NEXTAUTH_SECRET`: Generate one with `openssl rand -base64 32`.

4.  **Database Setup:**
    Initialize the SQLite database.
    ```bash
    npx prisma generate
    npx prisma db push
    ```

### 🏃‍♂️ Running the App

#### Option 1: Development Mode (Manual)
Start the Next.js development server.
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

#### Option 2: Docker (Recommended for Production)
Build and run the container.
```bash
docker build -t yt-summarizer .
docker run -p 3000:3000 -v $(pwd)/data:/app/data yt-summarizer
```

## 📖 Usage

1.  **Sign In**: Log in with your Google account.
2.  **Add Videos**: Paste a YouTube video URL or playlist link.
3.  **Summarize**: Click the "Summarize" button. The AI will process the video in multiple passes (Structure -> Deep Summary -> Optimization).
4.  **View & Export**: Read the structured summary directly in the app or click "Export" to save it as a Markdown file.

## 📂 Project Structure

-   `/src/app`: Next.js App Router pages and API routes.
-   `/src/components`: UI components (shadcn/ui).
-   `/src/lib`: Utility functions, AI logic (`/ai`), and database clients.
-   `/prisma`: Database schema and migrations.
-   `/public`: Static assets.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
