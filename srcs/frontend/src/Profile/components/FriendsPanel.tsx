
type Props = {
    title: string;
    friends: Array<{ userId: number; displayName: string }>;
    onSelectUserId: (userId: number) => void;
};

export default function FriendsPanel({ title, friends, onSelectUserId }: Props) {
    return (
        <div className="mt-4 rounded-lg bg-gray-100 px-3 py-3 text-sm text-gray-800">
            <div className="font-semibold mb-2">{title}</div>

            {friends.length === 0 ? (
                <div className="text-xs text-gray-500">Aucun ami pour le moment.</div>
            ) : (
                <div className="space-y-2">
                    {friends.map((f) => (
                        <button
                            key={f.userId}
                            type="button"
                            onClick={() => onSelectUserId(f.userId)}
                            className="w-full text-left rounded-md bg-white px-3 py-2 hover:bg-gray-50 transition-colors"
                        >
                            <div className="truncate font-medium">{f.displayName}</div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
