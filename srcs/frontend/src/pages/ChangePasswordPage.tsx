import { useState } from "react";
import { useTranslation } from "react-i18next";

const ChangePass = () => {
    const { t } = useTranslation();
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(false);

    const arcadeButtonBase =
        "hb-tap font-arcade uppercase tracking-wide cursor-pointer border-0 shadow-[0px_4px_rgb(255,255,255),0px_-4px_rgb(255,255,255),4px_0px_rgb(255,255,255),-4px_0px_rgb(255,255,255),0px_4px_rgba(0,0,0,0.22),4px_4px_rgba(0,0,0,0.22),-4px_4px_rgba(0,0,0,0.22),inset_0px_4px_rgba(255,255,255,0.21)] no-underline inline-flex items-center justify-center gap-2 transition-transform duration-100 active:translate-y-0.5 max-w-full";
    const arcadeActionButton =
        `${arcadeButtonBase} w-full h-14 min-[481px]:h-16 px-6 min-[481px]:px-7 text-xl min-[481px]:text-3xl`;

    const verifyPassword = async (): Promise<boolean> => {
        if (newPassword !== confirmPassword) {
            setMessage(t("New password and confirmation do not match."));
            setIsError(true);
            return false;
        }

        const identifier =
            localStorage.getItem("email") || localStorage.getItem("username") || "";
        if (!identifier) {
            setMessage(t("Not connected: missing identifier."));
            setIsError(true);
            return false;
        }

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    identifier,
                    password: currentPassword
                })
            });
            if (response.ok) {
                setIsError(false);
                return true;
            } else {
                setMessage(t("Current password is incorrect."));
                setIsError(true);
                return false;
            }
        } catch (error) {
            console.error("Error verifying password:", error);
            setIsError(true);
            setMessage(t("Error verifying password"));
            return false;
        }
    };

    const handleChangePassword = async () => {
        if (currentPassword === "" || newPassword === "" || confirmPassword === "") {
            setMessage(t("Please fill all fields"));
            setIsError(true);
            return;
        }

        const ok = await verifyPassword();
        if (!ok) return;

        const token = localStorage.getItem("access_token") || "";
        if (!token) {
            setMessage(t("Not connected: missing access token."));
            setIsError(true);
            return;
        }

        try {
            const response = await fetch("/api/profile/me/settings/user", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                    password: newPassword
                })
            });
            if (response.ok) {
                setMessage(t("Password changed successfully!"));
                setIsError(false);
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
            } else {
                const data = await response.json().catch(() => ({}));
                setMessage(data?.detail || t("Error changing password"));
                setIsError(true);
            }
        } catch (error) {
            console.error("Error changing password:", error);
            setMessage(t("Error changing password"));
            setIsError(true);
        }
    };

    return (
        <div className="relative min-h-[100dvh] w-full overflow-auto">
            <div className="fixed inset-0 bg-[url('/assets/bgHome.jpg')] bg-cover bg-center bg-no-repeat blur-sm" aria-hidden="true"></div>

            <div className="relative z-10 min-h-[100dvh] flex justify-center items-center px-4 py-8">
                <div className="bg-[#f5f0e8]/90 border-4 border-[#2b2b2b] px-6 py-8 min-[481px]:px-10 min-[481px]:py-12 text-center shadow-[6px_6px_0_#2b2b2b] w-[min(92vw,42rem)] flex flex-col items-center">
            <h1 className="hb-title font-arcade tracking-widest text-[#1f2937] mb-6">{t("Change Password")}</h1>
            <form className="bg-white p-6 rounded-lg shadow-md w-full max-w-sm mx-auto flex flex-col justify-center gap-4">
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="current-password">
                        {t("Current Password")}
                    </label>
                    <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="current-password" type="password" placeholder={t("Current Password")} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                </div>
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="new-password">
                        {t("New Password")}
                    </label>
                    <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="new-password" type="password" placeholder={t("New Password")} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
                <div className="mb-6">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirm-password">
                        {t("Confirm New Password")}
                    </label>
                    <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="confirm-password" type="password" placeholder={t("Confirm New Password")} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
                <div className="mb-4 flex items-center justify-between">
                    <button
                        className={`${arcadeActionButton} bg-purple-600 hover:bg-purple-700 text-white`}
                        type="button"
                        onClick={handleChangePassword}
                    >
                        {t("Change Password")}
                    </button>
                </div>
            </form>
            {message && <p className={`mt-4 ${isError ? 'text-red-500' : 'text-green-500'}`}>{message}</p>}
            </div>
            </div>
        </div>
    );
}

export default ChangePass