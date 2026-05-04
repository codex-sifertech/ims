import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('Uncaught render error:', error, info.componentStack);
    }

    render() {
        if (!this.state.hasError) return this.props.children;

        return (
            <div className="min-h-screen bg-dark-900 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-dark-800 border border-dark-700 rounded-2xl p-8 text-center space-y-4">
                    <div className="w-14 h-14 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto">
                        <AlertTriangle size={28} className="text-rose-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-white">Something went wrong</h2>
                    <p className="text-slate-400 text-sm">
                        {this.state.error?.message || 'An unexpected error occurred.'}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        <RefreshCw size={16} />
                        Reload App
                    </button>
                </div>
            </div>
        );
    }
}
