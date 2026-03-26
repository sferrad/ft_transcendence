import { useState } from "react";

const ChangePass = () => {
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(false);

    const verifyPassword = async (): Promise<boolean> => {
        if (newPassword !== confirmPassword) {
            setMessage("New password and confirmation do not match.");
            setIsError(true);
            return false;
        }

        const identifier =
            localStorage.getItem("email") || localStorage.getItem("username") || "";
        if (!identifier) {
            setMessage("Not connected: missing identifier.");
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
                setMessage("Current password is incorrect.");
                setIsError(true);
                return false;
            }
        } catch (error) {
            console.error("Error verifying password:", error);
            setIsError(true);
            setMessage("Error verifying password");
            return false;
        }
    };

    const handleChangePassword = async () => {
        if (currentPassword === "" || newPassword === "" || confirmPassword === "") {
            setMessage("Please fill all fields");
            setIsError(true);
            return;
        }

        const ok = await verifyPassword();
        if (!ok) return;

        const token = localStorage.getItem("access_token") || "";
        if (!token) {
            setMessage("Not connected: missing access token.");
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
                setMessage("Password changed successfully!");
                setIsError(false);
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
            } else {
                const data = await response.json().catch(() => ({}));
                setMessage(data?.detail || "Error changing password");
                setIsError(true);
            }
        } catch (error) {
            console.error("Error changing password:", error);
            setMessage("Error changing password");
            setIsError(true);
        }
    };

    return (
        <div>
        <div className="fixed inset-0 bg-[url('/assets/bgHome.png')] bg-cover bg-center bg-no-repeat blur-sm"></div> 
        <div className="absolute inset-0 flex justify-center items-center z-10">
            <div className="bg-[#f5f0e8]/90 border-4 border-[#2b2b2b] px-10 py-12 text-center shadow-[6px_6px_0_#2b2b2b] w-110 flex flex-col items-center">
            <h1 className="text-7xl font-arcade tracking-widest text-[#1f2937] mb-6">Change Password</h1>
            <form className="bg-white p-6 rounded-lg shadow-md w-80 mx-auto flex flex-col justify-center gap-4">
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="current-password">
                        Current Password
                    </label>
                    <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="current-password" type="password" placeholder="Current Password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                </div>
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="new-password">
                        New Password
                    </label>
                    <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="new-password" type="password" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
                <div className="mb-6">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirm-password">
                        Confirm New Password
                    </label>
                    <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="confirm-password" type="password" placeholder="Confirm New Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
                <div className="mb-4 flex items-center justify-between">
                    <button className="font-arcade cursor-pointer px-8 py-3 text-3xl text-black bg-gradient-to-b from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-lg transition-all duration-200 translate-button transform hover:scale-105 shadow-lg hover:shadow-xl w-72 flex justify-center items-center" type="button" onClick={handleChangePassword}>
                        Change Password
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