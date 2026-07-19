export default function Loading() {
    return (
        <div className="flex-1 w-full space-y-6 animate-pulse p-6">
            <div className="flex justify-between items-center mb-6">
                <div className="space-y-2">
                    <div className="h-8 w-48 bg-zinc-200/60 rounded-lg"></div>
                    <div className="h-4 w-64 bg-zinc-100 rounded-md"></div>
                </div>
                <div className="h-10 w-32 bg-zinc-200/60 rounded-xl"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-32 bg-zinc-100/80 rounded-2xl border border-zinc-200/50"></div>
                ))}
            </div>

            <div className="rounded-2xl border border-zinc-200/50 bg-white overflow-hidden">
                <div className="h-14 border-b border-zinc-100 bg-zinc-50/50 flex items-center px-6">
                    <div className="h-4 w-full bg-zinc-200/40 rounded-md"></div>
                </div>
                <div className="divide-y divide-zinc-100">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="h-16 flex items-center px-6 gap-4">
                            <div className="h-4 w-8 bg-zinc-200/50 rounded-md"></div>
                            <div className="h-4 w-1/4 bg-zinc-200/50 rounded-md"></div>
                            <div className="h-4 w-1/4 bg-zinc-100 rounded-md"></div>
                            <div className="h-4 w-1/4 bg-zinc-100 rounded-md"></div>
                            <div className="h-6 w-16 bg-zinc-200/50 rounded-full ml-auto"></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
