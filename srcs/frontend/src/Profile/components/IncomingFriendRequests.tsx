import type { FriendRequestOut } from "../types";

type Props = {
    title: string;
    subtitle: string;
    acceptLabel: string;
    rejectLabel: string;
    requests: FriendRequestOut[];
    requesterNames: Record<number, string>;
    onAccept: (requestId: number) => void;
    onReject: (requestId: number) => void;
};

export default function IncomingFriendRequests({
    title,
    subtitle,
    acceptLabel,
    rejectLabel,
    requests,
    requesterNames,
    onAccept,
    onReject,
}: Props) {
    if (requests.length === 0) return null;

    return (
        <div className="mt-4 rounded-lg bg-gray-100 px-3 py-3 text-sm text-gray-800">
            <div className="font-semibold mb-2">{title}</div>
            <div className="space-y-2">
                {requests.map((req) => (
                    <div
                        key={req.id}
                        className="flex items-center justify-between gap-2 rounded-md bg-white px-3 py-2"
                    >
                        <div className="min-w-0">
                            <div className="truncate font-medium">
                                {requesterNames[req.from_user_id] ?? String(req.from_user_id)}
                            </div>
                            <div className="text-xs text-gray-500">{subtitle}</div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                            <button
                                type="button"
                                onClick={() => onAccept(req.id)}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors text-xs"
                            >
                                {acceptLabel}
                            </button>
                            <button
                                type="button"
                                onClick={() => onReject(req.id)}
                                className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors text-xs"
                            >
                                {rejectLabel}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
