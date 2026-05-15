import { useState } from "react";
import { useTranslation } from "react-i18next";

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

const SaveData = () => {
    const { t } = useTranslation();
    const [format, setFormat] = useState("json");
    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(false);

    const arcadeButtonBase =
        "hb-tap font-arcade uppercase tracking-wide cursor-pointer border-0 shadow-[0px_4px_rgb(255,255,255),0px_-4px_rgb(255,255,255),4px_0px_rgb(255,255,255),-4px_0px_rgb(255,255,255),0px_4px_rgba(0,0,0,0.22),4px_4px_rgba(0,0,0,0.22),-4px_4px_rgba(0,0,0,0.22),inset_0px_4px_rgba(255,255,255,0.21)] no-underline inline-flex items-center justify-center gap-2 transition-transform duration-100 active:translate-y-0.5 max-w-full";
    const arcadeActionButton =
        `${arcadeButtonBase} w-full h-14 min-[481px]:h-16 px-6 min-[481px]:px-7 text-xl min-[481px]:text-3xl`;

    const handleSave = async () => {
        setMessage("");
        setIsError(false);

        try {
            if (format !== "json") {
                throw new Error(t("Only JSON export is available for now."));
            }

            const token = localStorage.getItem("access_token") || "";
            if (!token) {
                throw new Error(t("Not connected: missing access token."));
            }

            const response = await fetch("/api/profile/me/export", {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const apiMessage = await safeReadErrorMessage(response);
                throw new Error(apiMessage || `${t("Failed to save data")} (HTTP ${response.status}).`);
            }

            const blob = await response.blob();
            const contentDisposition = response.headers.get("content-disposition") || "";
            const filenameMatch = contentDisposition.match(/filename=([^;]+)/i);
            const filename = filenameMatch ? filenameMatch[1].replace(/"/g, "").trim() : "my_transcendence_data.json";
            const url = window.URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            setMessage(t("Your data export is ready for download."));
            setIsError(false);
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : t("Failed to save data");
            setMessage(msg);
            setIsError(true);
        }
    };

    return (
        <div className="relative min-h-[100dvh] w-full overflow-auto">
            <div className="fixed inset-0 bg-[url('/assets/bgHome.jpg')] bg-cover bg-center bg-no-repeat blur-sm" aria-hidden="true"></div>
            <div className="relative z-10 min-h-[100dvh] flex justify-center items-center px-4 py-8">
                <div className="bg-[#f5f0e8]/90 border-4 border-[#2b2b2b] px-6 py-8 min-[481px]:px-10 min-[481px]:py-12 text-center shadow-[6px_6px_0_#2b2b2b] w-[min(92vw,46rem)] flex flex-col items-center">
                    <h1 className="hb-title font-arcade tracking-widest text-[#1f2937] mb-6">{t("Save Data")}</h1>
                    <p className="text-sm text-[#1f2937] mb-6 max-w-md">
                        {t("Request an export of your personal data. The download starts in your browser and we confirm by email.")}
                    </p>
                    <form className="bg-white p-6 rounded-lg shadow-md w-full max-w-md mx-auto flex flex-col justify-center gap-4">
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="export-format">
                                {t("Format")}
                            </label>
                            <select
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                id="export-format"
                                value={format}
                                onChange={(e) => setFormat(e.target.value)}
                            >
                                <option value="json">JSON</option>
                            </select>
                        </div>
                        <div className="mb-2 flex items-center justify-between">
                            <button
                                className={`${arcadeActionButton} bg-amber-500 hover:bg-amber-600 text-black`}
                                type="button"
                                onClick={handleSave}
                            >
                                {t("Request Export")}
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

export default SaveData;