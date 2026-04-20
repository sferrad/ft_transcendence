
type Props = {
    title: string;
    friends: Array<{ userId: number; displayName: string; online: boolean }>;
    onSelectUserId: (userId: number) => void;
};

export default function FriendsPanel({ title, friends, onSelectUserId }: Props) {
    return (
        <div className="mt-4 rounded-lg bg-white/75 border-2 border-[#2b2b2b] shadow-[3px_3px_0_#2b2b2b] px-4 py-4 text-[#1f2937]">
            <div className="font-arcade tracking-wide text-base min-[481px]:text-lg mb-3">{title}</div>

            {friends.length === 0 ? (
                <div className="text-sm opacity-80">Aucun ami pour le moment.</div>
            ) : (
                <div className="space-y-2">
                    {friends.map((f) => (
                        <button
                            key={f.userId}
                            type="button"
                            onClick={() => onSelectUserId(f.userId)}
                            className="hb-tap w-full text-left rounded-lg bg-white/90 border-2 border-[#2b2b2b] px-3 py-2 shadow-[2px_2px_0_#2b2b2b] hover:bg-white transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <span
                                    className={[
                                        "h-2.5 w-2.5 rounded-full border border-[#2b2b2b]",
                                        f.online ? "bg-green-500" : "bg-red-700",
                                    ].join(" ")}
                                    aria-label={f.online ? "Online" : "Offline"}
                                />
                                <div className="truncate font-medium">{f.displayName}</div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
