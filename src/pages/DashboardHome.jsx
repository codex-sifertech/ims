import PersonalKanban from '../components/dashboard/PersonalKanban';
import VisionBoard from '../components/dashboard/VisionBoard';

export default function DashboardHome() {
    return (
        <div className="h-full flex flex-col p-6 space-y-6">
            <header>
                <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard Overview</h1>
                <p className="text-slate-400 mt-1">Manage your personal tasks and big-picture ideas.</p>
            </header>

            <div className="flex-1 flex gap-6 overflow-hidden">
                {/* Kanban Section takes up more space */}
                <section className="flex-[2] overflow-hidden min-w-[600px]">
                    <PersonalKanban />
                </section>

                {/* Vision Board takes up the remaining space */}
                <section className="flex-1 overflow-hidden min-w-[300px]">
                    <VisionBoard />
                </section>
            </div>
        </div>
    );
}
