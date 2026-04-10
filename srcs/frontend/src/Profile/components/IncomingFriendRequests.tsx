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

    const arcadeButtonBase =
        "hb-tap font-arcade cursor-pointer border-0 shadow-[0px_4px_rgb(255,255,255),0px_-4px_rgb(255,255,255),4px_0px_rgb(255,255,255),-4px_0px_rgb(255,255,255),0px_4px_rgba(0,0,0,0.22),4px_4px_rgba(0,0,0,0.22),-4px_4px_rgba(0,0,0,0.22),inset_0px_4px_rgba(255,255,255,0.21)] no-underline inline-flex items-center justify-center gap-2 transition-transform duration-100 active:translate-y-0.5 max-w-full";
    const arcadeTinyButton = `${arcadeButtonBase} px-3 py-2 text-xs min-[481px]:text-sm`;

    return (
        <div className="mt-4 rounded-lg bg-white/75 border-2 border-[#2b2b2b] shadow-[3px_3px_0_#2b2b2b] px-4 py-4 text-[#1f2937]">
            <div className="font-arcade tracking-wide text-base min-[481px]:text-lg mb-3">{title}</div>
            <div className="space-y-2">
                {requests.map((req) => (
                    <div
                        key={req.id}
                        className="flex items-center justify-between gap-3 rounded-lg bg-white/90 border-2 border-[#2b2b2b] px-3 py-3 shadow-[2px_2px_0_#2b2b2b]"
                    >
                        <div className="min-w-0">
                            <div className="truncate font-medium">
                                {requesterNames[req.from_user_id] ?? String(req.from_user_id)}
                            </div>
                            <div className="text-xs opacity-80">{subtitle}</div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                            <button
                                type="button"
                                onClick={() => onAccept(req.id)}
                                className={`${arcadeTinyButton} text-white bg-[#4AD95A] hover:bg-green-600`}
                            >
                                {acceptLabel}
                            </button>
                            <button
                                type="button"
                                onClick={() => onReject(req.id)}
                                className={`${arcadeTinyButton} text-white bg-red-600 hover:bg-red-700`}
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
