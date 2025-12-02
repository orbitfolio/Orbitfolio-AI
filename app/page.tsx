export default function Page() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="container mx-auto px-4 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-white mb-6">Orbitfolio</h1>
          <p className="text-xl text-slate-300 mb-8">
            Your portfolio, analyzed and tracked in real-time
          </p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition">
            Get Started
          </button>
        </div>
      </div>
    </main>
  );
}
