import { useState } from "react";
import { useTranslation } from "react-i18next";

const ChangeMail = () => {
    const { t } = useTranslation();
    const [currentEmail, setCurrentEmail] = useState(localStorage.getItem("email") || "");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [confirmEmail, setConfirmEmail] = useState("");
    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(false);

    const arcadeButtonBase =
        "hb-tap font-arcade uppercase tracking-wide cursor-pointer border-0 shadow-[0px_4px_rgb(255,255,255),0px_-4px_rgb(255,255,255),4px_0px_rgb(255,255,255),-4px_0px_rgb(255,255,255),0px_4px_rgba(0,0,0,0.22),4px_4px_rgba(0,0,0,0.22),-4px_4px_rgba(0,0,0,0.22),inset_0px_4px_rgba(255,255,255,0.21)] no-underline inline-flex items-center justify-center gap-2 transition-transform duration-100 active:translate-y-0.5 max-w-full";
    const arcadeActionButton =
        `${arcadeButtonBase} w-full h-14 min-[481px]:h-16 px-6 min-[481px]:px-7 text-xl min-[481px]:text-3xl`;
    const arcadeBackButton =
        `${arcadeButtonBase} normal-case tracking-normal whitespace-nowrap h-11 min-[481px]:h-12 min-[769px]:h-14 px-3 min-[481px]:px-4 min-[769px]:px-5 text-base min-[481px]:text-lg min-[769px]:text-xl`;

    type ApiErrorLike = {
        detail?: unknown;
        message?: unknown;
        error?: {
            message?: unknown;
        };
    };

    const isEmailAlreadyTakenError = (statusCode: number, data: unknown): boolean => {
        const d = (data ?? {}) as ApiErrorLike;
        const text = String(d?.detail ?? d?.message ?? d?.error?.message ?? "").toLowerCase();
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
            setMessage(t("Not connected: missing identifier."));
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
                setMessage(data?.detail || data?.message || t("Current password is incorrect."));
                setIsError(true);
                return false;
            }
            return true;
        } catch {
            setMessage(t("An error occurred while verifying password."));
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
            setMessage(t("Please fill all fields"));
            setIsError(true);
            return;
        }

        if (trimmedNew !== trimmedConfirm) {
            setMessage(t("New email and confirmation do not match."));
            setIsError(true);
            return;
        }

        if (trimmedNew === trimmedCurrent) {
            setMessage(t("New email must be different from current email."));
            setIsError(true);
            return;
        }

        const token = localStorage.getItem("access_token") || "";
        if (!token) {
            setMessage(t("Not connected: missing access token."));
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
                setMessage(t("Email updated successfully"));
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
                setMessage(t("Email already taken"));
            } else {
                setMessage(data?.detail || data?.message || t("Failed to update email"));
            }
            setIsError(true);
        } catch {
            setMessage(t("An error occurred while updating email."));
            setIsError(true);
        }
    };

    return (
        <div className="relative min-h-[100dvh] w-full overflow-auto">
            <div className="fixed inset-0 bg-[url('/assets/bgHome.jpg')] bg-cover bg-center bg-no-repeat blur-sm" aria-hidden="true"></div>
            <div className="relative z-10 min-h-[100dvh] flex justify-center items-center px-4 py-8">
                <button
                    onClick={() => window.history.back()}
                    className={`absolute top-3 left-3 min-[481px]:top-6 min-[481px]:left-6 ${arcadeBackButton} text-white bg-blue-600 hover:bg-blue-700`}
                >
                    {t("Back")}
                </button>
                <div className="bg-[#f5f0e8]/90 border-4 border-[#2b2b2b] px-6 py-8 min-[481px]:px-10 min-[481px]:py-12 text-center shadow-[6px_6px_0_#2b2b2b] w-[min(92vw,42rem)] flex flex-col items-center">
                    <h1 className="hb-title font-arcade tracking-widest text-[#1f2937] mb-6">{t("Change Email")}</h1>
                    <form className="bg-white p-6 rounded-lg shadow-md w-full max-w-sm mx-auto flex flex-col justify-center gap-4">
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="current-email">
                                {t("Current Email")}
                            </label>
                            <input
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                id="current-email"
                                type="email"
                                placeholder={t("Current Email")}
                                value={currentEmail}
                                onChange={(e) => setCurrentEmail(e.target.value)}
                            />
                        </div>
                        <div className="mb-6">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="current-password">
                                {t("Current Password")}
                            </label>
                            <input
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                id="current-password"
                                type="password"
                                placeholder={t("Current Password")}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="new-email">
                                {t("New Email")}
                            </label>
                            <input
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                id="new-email"
                                type="email"
                                placeholder={t("New Email")}
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                            />
                        </div>
                        <div className="mb-6">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirm-email">
                                {t("Confirm New Email")}
                            </label>
                            <input
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                id="confirm-email"
                                type="email"
                                placeholder={t("Confirm New Email")}
                                value={confirmEmail}
                                onChange={(e) => setConfirmEmail(e.target.value)}
                            />
                        </div>
                        <div className="mb-4 flex items-center justify-between">
                            <button
                                className={`${arcadeActionButton} bg-purple-600 hover:bg-purple-700 text-white`}
                                type="button"
                                onClick={handleChangeEmail}
                            >
                                {t("Change Email")}
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
