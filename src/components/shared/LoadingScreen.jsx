export default function LoadingScreen({ message = 'Loading IMS...' }) {
    return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-dark-900 text-white gap-4">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400">{message}</p>
        </div>
    );
}
