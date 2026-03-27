import { useState } from "react";
import { useNavigate } from "react-router-dom";

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

export const deleteAccount = async (currentPassword: string): Promise<boolean> => {
    if (!currentPassword) {
        throw new Error("Please fill all fields");
    }

    const identifier =
        localStorage.getItem("email") || localStorage.getItem("username") || "";
    if (!identifier) {
        throw new Error("Not connected: missing identifier.");
    }

    const token = localStorage.getItem("access_token") || "";
    if (!token) {
        throw new Error("Not connected: missing access token.");
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
            throw new Error("Current password is incorrect.");
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
        throw new Error(apiMessage || `Failed to delete account (HTTP ${response.status}).`);
    } catch (error: unknown) {
        console.error("Error deleting account:", error);
        const message = error instanceof Error ? error.message : "An error occurred while deleting the account.";
        throw new Error(message);
    }
};

const DeleteAcc = () => {
    const navigate = useNavigate();
    const [currentPassword, setCurrentPassword] = useState("");
    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(false);

    const handleDelete = async () => {
        setMessage("");
        setIsError(false);

        try {
            const deleted = await deleteAccount(currentPassword);
            if (!deleted) {
                throw new Error("Failed to delete account");
            }

            localStorage.removeItem("access_token");
            localStorage.removeItem("username");
            localStorage.removeItem("email");
            localStorage.removeItem("user_id");

            setCurrentPassword("");
            setMessage("Account deleted successfully");
            setIsError(false);

            setTimeout(() => {
                navigate("/");
                window.location.reload();
            }, 1200);
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "Failed to delete account";
            setMessage(msg);
            setIsError(true);
        }
    };

    return (
        <div>
            <div className="fixed inset-0 bg-[url('/assets/bgHome.png')] bg-cover bg-center bg-no-repeat blur-sm"></div>
            <div className="absolute inset-0 flex justify-center items-center z-10">
                <div className="bg-[#f5f0e8]/90 border-4 border-[#2b2b2b] px-10 py-12 text-center shadow-[6px_6px_0_#2b2b2b] w-110 flex flex-col items-center">
                    <h1 className="text-7xl font-arcade tracking-widest text-[#1f2937] mb-6">Delete Account</h1>
                    <form className="bg-white p-6 rounded-lg shadow-md w-80 mx-auto flex flex-col justify-center gap-4">
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
                        <div className="mb-4 flex items-center justify-between">
                            <button
                                className="font-arcade cursor-pointer px-8 py-3 text-3xl text-black bg-gradient-to-b from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-lg transition-all duration-200 translate-button transform hover:scale-105 shadow-lg hover:shadow-xl w-72 flex justify-center items-center"
                                type="button"
                                onClick={handleDelete}
                            >
                                Delete Account
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