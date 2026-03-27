import { useState } from "react";

const ChangeMail = () => {
    const [currentEmail, setCurrentEmail] = useState(localStorage.getItem("email") || "");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [confirmEmail, setConfirmEmail] = useState("");
    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(false);

    const isEmailAlreadyTakenError = (statusCode: number, data: any): boolean => {
        const text = String(data?.detail ?? data?.message ?? data?.error?.message ?? "").toLowerCase();
        if (statusCode === 409) return true;
        if (statusCode === 400 && text.includes("email") && (text.includes("already") || text.includes("registered") || text.includes("taken"))) {
            return true;
        }
        if (text.includes("unique") && text.includes("email")) return true;
        if (text.includes("duplicate") && text.includes("email")) return true;
        return false;
    };

    const verifyPassword = async (): Promise<boolean> => {
        const identifier = currentEmail.trim() || localStorage.getItem("email") || localStorage.getItem("username") || "";
        if (!identifier) {
            setMessage("Not connected: missing identifier.");
            setIsError(true);
            return false;
        }
        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    identifier,
                    password: currentPassword,
                }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                setMessage(data?.detail || data?.message || "Current password is incorrect.");
                setIsError(true);
                return false;
            }
            return true;
        } catch (error) {
            setMessage("An error occurred while verifying password.");
            setIsError(true);
            return false;
        }
    };

    const handleChangeEmail = async () => {
        setMessage("");
        setIsError(false);

        const trimmedCurrent = currentEmail.trim();
        const trimmedNew = newEmail.trim();
        const trimmedConfirm = confirmEmail.trim();

        if (!trimmedCurrent || !trimmedNew || !trimmedConfirm || !currentPassword) {
            setMessage("Please fill all fields");
            setIsError(true);
            return;
        }

        if (trimmedNew !== trimmedConfirm) {
            setMessage("New email and confirmation do not match.");
            setIsError(true);
            return;
        }

        if (trimmedNew === trimmedCurrent) {
            setMessage("New email must be different from current email.");
            setIsError(true);
            return;
        }

        const token = localStorage.getItem("access_token") || "";
        if (!token) {
            setMessage("Not connected: missing access token.");
            setIsError(true);
            return;
        }

        const ok = await verifyPassword();
        if (!ok) return;

        try {
            const response = await fetch("/api/profile/me/settings/user", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                    email: trimmedNew,
                }),
            });

            if (response.ok) {
                setMessage("Email updated successfully");
                setIsError(false);
                setCurrentEmail(trimmedNew);
                setNewEmail("");
                setConfirmEmail("");
                setCurrentPassword("");
                localStorage.setItem("email", trimmedNew);
                return;
            }

            const data = await response.json().catch(() => ({}));
            if (isEmailAlreadyTakenError(response.status, data)) {
                setMessage("Email already taken");
            } else {
                setMessage(data?.detail || data?.message || "Failed to update email");
            }
            setIsError(true);
        } catch (error) {
            setMessage("An error occurred while updating email.");
            setIsError(true);
        }
    };

    return (
        <div>
            <div className="fixed inset-0 bg-[url('/assets/bgHome.png')] bg-cover bg-center bg-no-repeat blur-sm"></div>
            <div className="absolute inset-0 flex justify-center items-center z-10">
                <div className="bg-[#f5f0e8]/90 border-4 border-[#2b2b2b] px-10 py-12 text-center shadow-[6px_6px_0_#2b2b2b] w-110 flex flex-col items-center">
                    <h1 className="text-7xl font-arcade tracking-widest text-[#1f2937] mb-6">Change Email</h1>
                    <form className="bg-white p-6 rounded-lg shadow-md w-80 mx-auto flex flex-col justify-center gap-4">
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="current-email">
                                Current Email
                            </label>
                            <input
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                id="current-email"
                                type="email"
                                placeholder="Current Email"
                                value={currentEmail}
                                onChange={(e) => setCurrentEmail(e.target.value)}
                            />
                        </div>
                        <div className="mb-6">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="current-password">
                                Current Password
                            </label>
                            <input
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                id="current-password"
                                type="password"
                                placeholder="Current Password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="new-email">
                                New Email
                            </label>
                            <input
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                id="new-email"
                                type="email"
                                placeholder="New Email"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                            />
                        </div>
                        <div className="mb-6">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirm-email">
                                Confirm New Email
                            </label>
                            <input
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                id="confirm-email"
                                type="email"
                                placeholder="Confirm New Email"
                                value={confirmEmail}
                                onChange={(e) => setConfirmEmail(e.target.value)}
                            />
                        </div>
                        <div className="mb-4 flex items-center justify-between">
                            <button
                                className="font-arcade cursor-pointer px-8 py-3 text-3xl text-black bg-gradient-to-b from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-lg transition-all duration-200 translate-button transform hover:scale-105 shadow-lg hover:shadow-xl w-72 flex justify-center items-center"
                                type="button"
                                onClick={handleChangeEmail}
                            >
                                Change Email
                            </button>
                        </div>
                    </form>
                    {message && <p className={`mt-4 ${isError ? "text-red-500" : "text-green-500"}`}>{message}</p>}
                </div>
            </div>
        </div>
    );
};

export default ChangeMail;
