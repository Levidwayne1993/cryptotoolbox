import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';

const LiveBotDashboard = dynamic(() => import('@/components/LiveBotDashboard'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
    </div>
  ),
});

export default function BotPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">🤖 Live Trading Bot</h1>
          <p className="text-sm text-gray-400 mt-1">
            Real-time data from your bot running on Railway — powered by Supabase
          </p>
        </div>
        <LiveBotDashboard />
      </div>
    </main>
  );
}
