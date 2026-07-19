"use client";

// @ts-ignore
import { AuditLog, User } from "@/generated/prisma/client/client";
import {
    Activity,
    Trash2,
    Edit,
    PlusCircle,
    Upload,
    LogIn,
    User as UserIcon,
    ArrowRight
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AuditLogEntry extends AuditLog {
    user: {
        name: string | null;
        email: string | null;
    };
}

export function AuditLogView({ logs }: { logs: any[] }) {
    const getActionIcon = (action: string) => {
        switch (action) {
            case "CREATE": return <PlusCircle className="w-4 h-4 text-indigo-500" />;
            case "UPDATE": return <Edit className="w-4 h-4 text-amber-500" />;
            case "DELETE": return <Trash2 className="w-4 h-4 text-red-500" />;
            case "BULK_DELETE": return <Trash2 className="w-4 h-4 text-red-600" />;
            case "BULK_IMPORT": return <Upload className="w-4 h-4 text-blue-500" />;
            case "LOGIN": return <LogIn className="w-4 h-4 text-indigo-500" />;
            default: return <Activity className="w-4 h-4 text-zinc-500" />;
        }
    };

    if (!logs || logs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                <ShieldAlert className="w-12 h-12 mb-4 opacity-20" />
                <p>No system audit logs found.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {logs.map((log) => (
                <div key={log.id} className="group flex items-start gap-4 p-4 bg-white border border-zinc-200 rounded-xl hover:shadow-md transition-all">
                    <div className="mt-1 p-2 rounded-lg bg-zinc-50 border border-zinc-100 group-hover:bg-white transition-colors">
                        {getActionIcon(log.action)}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                            <h4 className="font-bold text-zinc-900 flex items-center gap-2">
                                {log.action.replace("_", " ")}
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 font-bold uppercase tracking-wider">
                                    {log.entityType}
                                </span>
                            </h4>
                            <span className="text-xs text-zinc-400 font-medium">
                                {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                            </span>
                        </div>

                        <p className="text-sm text-zinc-600 mb-2 leading-relaxed">
                            {log.details}
                        </p>

                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 py-1 px-2 rounded-md bg-zinc-50 border border-zinc-100 text-xs text-zinc-500 font-medium">
                                <UserIcon className="w-3 h-3 text-zinc-400" />
                                {log.user.name || log.user.email}
                            </div>
                            {log.entityId && (
                                <div className="text-[10px] text-zinc-300 font-mono flex items-center gap-1">
                                    ID: {log.entityId.substring(0, 8)}...
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

import { ShieldAlert } from "lucide-react";
