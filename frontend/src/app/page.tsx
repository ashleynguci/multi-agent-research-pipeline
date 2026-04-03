export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <h1 className="text-3xl font-bold mb-2">Research Pipeline</h1>
        <p className="text-gray-400 mb-8">
          Multi-agent AI research with live progress streaming.
        </p>
        <form className="flex gap-3">
          <input
            type="text"
            placeholder="Enter your research query..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors"
          >
            Research
          </button>
        </form>
      </div>
    </main>
  );
}
