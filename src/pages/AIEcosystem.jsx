import { ExternalLink, Sparkles } from 'lucide-react';

const AI_TOOLS = [
    { name: 'ChatGPT', desc: 'Versatile AI assistant by OpenAI.', url: 'https://chat.openai.com', color: 'bg-emerald-500' },
    { name: 'Gemini', desc: 'Google\'s multimodal AI model.', url: 'https://gemini.google.com', color: 'bg-blue-500' },
    { name: 'Claude', desc: 'Anthropic\'s advanced reasoning AI.', url: 'https://claude.ai', color: 'bg-orange-500' },
    { name: 'Perplexity', desc: 'AI-powered search engine.', url: 'https://www.perplexity.ai', color: 'bg-cyan-500' },
    { name: 'Midjourney', desc: 'AI image generation.', url: 'https://www.midjourney.com', color: 'bg-purple-500' },
];

export default function AIEcosystem() {
    return (
        <div className="h-full flex flex-col p-8 overflow-y-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                    <Sparkles className="text-primary-500" size={32} />
                    AI Ecosystem
                </h1>
                <p className="text-slate-400 mt-2 max-w-2xl">
                    Quick access hub to major artificial intelligence platforms. Use these tools to enhance your productivity, draft content, and solve complex problems.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {AI_TOOLS.map((tool) => (
                    <a
                        key={tool.name}
                        href={tool.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block p-6 bg-dark-800 border border-dark-700 rounded-2xl hover:border-primary-500 hover:shadow-[0_0_30px_rgba(79,70,229,0.15)] transition-all"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className={`w-12 h-12 rounded-xl ${tool.color} bg-opacity-10 text-white flex items-center justify-center font-bold text-lg border border-white/10`}>
                                {tool.name.charAt(0)}
                            </div>
                            <ExternalLink size={20} className="text-slate-500 group-hover:text-white transition-colors" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">{tool.name}</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">{tool.desc}</p>
                    </a>
                ))}
            </div>
        </div>
    );
}
