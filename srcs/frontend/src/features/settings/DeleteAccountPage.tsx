import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { closeSocket } from "../../hooks/socketSingleton";

type TFunction = (key: string) => string;

const safeReadErrorMessage = async (response: Response): Promise<string> => {
    const contentType = response.headers.get("content-type") || "";
    try {
        if (contentType.includes("application/json")) {
            const data = await response.json().catch(() => ({}));
            return data?.detail || data?.message || data?.error?.message || "";
        }
        const text = await response.text().catch(() => "");
        return text;
    } catch {
        return "";
    }
};

const deleteAccount = async (currentPassword: string, t: TFunction): Promise<boolean> => {
    if (!currentPassword) {
        throw new Error(t("Please fill all fields"));
    }

    const identifier =
        localStorage.getItem("email") || localStorage.getItem("username") || "";
    if (!identifier) {
        throw new Error(t("Not connected: missing identifier."));
    }

    const token = localStorage.getItem("access_token") || "";
    if (!token) {
        throw new Error(t("Not connected: missing access token."));
    }

    try {
        const loginResponse = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                identifier,
                password: currentPassword
            })
        });
        if (!loginResponse.ok) {
            throw new Error(t("Current password is incorrect."));
        }

        const response = await fetch("/api/profile/me/settings/user", {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        if (response.ok) {
            return true;
        }


        const confirm = await fetch("/api/auth/me", {
            headers: {
                "Authorization": `Bearer ${token}`,
            },
        }).catch(() => null);

        if (!confirm || !confirm.ok) {
            return true;
        }

        const apiMessage = await safeReadErrorMessage(response);
        throw new Error(apiMessage || `${t("Failed to delete account")} (HTTP ${response.status}).`);
    } catch (error: unknown) {
        console.error("Error deleting account:", error);
        const message = error instanceof Error ? error.message : t("An error occurred while deleting the account.");
        throw new Error(message);
    }
};

const DeleteAcc = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [currentPassword, setCurrentPassword] = useState("");
    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(false);

    const arcadeButtonBase =
        "hb-tap font-arcade uppercase tracking-wide cursor-pointer border-0 shadow-[0px_4px_rgb(255,255,255),0px_-4px_rgb(255,255,255),4px_0px_rgb(255,255,255),-4px_0px_rgb(255,255,255),0px_4px_rgba(0,0,0,0.22),4px_4px_rgba(0,0,0,0.22),-4px_4px_rgba(0,0,0,0.22),inset_0px_4px_rgba(255,255,255,0.21)] no-underline inline-flex items-center justify-center gap-2 transition-transform duration-100 active:translate-y-0.5 max-w-full";
    const arcadeActionButton =
        `${arcadeButtonBase} w-full h-14 min-[481px]:h-16 px-6 min-[481px]:px-7 text-xl min-[481px]:text-3xl`;
    const arcadeBackButton =
        `${arcadeButtonBase} normal-case tracking-normal whitespace-nowrap h-11 min-[481px]:h-12 min-[769px]:h-14 px-3 min-[481px]:px-4 min-[769px]:px-5 text-base min-[481px]:text-lg min-[769px]:text-xl`;

    const handleDelete = async () => {
        setMessage("");
        setIsError(false);

        try {
            const deleted = await deleteAccount(currentPassword, t);
            if (!deleted) {
                throw new Error(t("Failed to delete account"));
            }

            closeSocket();
            localStorage.removeItem("access_token");
            localStorage.removeItem("username");
            localStorage.removeItem("email");
            localStorage.removeItem("user_id");

            setCurrentPassword("");
            setMessage(t("Account deleted successfully"));
            setIsError(false);

            setTimeout(() => {
                navigate("/");
                window.location.reload();
            }, 1200);
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : t("Failed to delete account");
            setMessage(msg);
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
                    <h1 className="hb-title font-arcade tracking-widest text-[#1f2937] mb-6">{t("Delete Account")}</h1>
                    <form className="bg-white p-6 rounded-lg shadow-md w-full max-w-sm mx-auto flex flex-col justify-center gap-4">
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
                        <div className="mb-4 flex items-center justify-between">
                            <button
                                className={`${arcadeActionButton} bg-red-600 hover:bg-red-700 text-white`}
                                type="button"
                                onClick={handleDelete}
                            >
                                {t("Delete Account")}
                            </button>
                        </div>
                    </form>
                    {message && (
                        <p className={`mt-4 ${isError ? "text-red-500" : "text-green-500"}`}>{message}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DeleteAcc;