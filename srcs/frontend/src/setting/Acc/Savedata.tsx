import { useState } from "react";
import { useTranslation } from "react-i18next";

const SaveData = () => {
    const { t } = useTranslation();
    const [format, setFormat] = useState("json");
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(false);

    const handleSave = async () => {
        setMessage("");
        setIsError(false);

        try {
            if (!email.trim()) {
                throw new Error(t("Please fill all fields"));
            }

            // Placeholder for backend call. User will connect API later.
            setMessage(t("Your data export has been queued."));
            setIsError(false);
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : t("Failed to save data");
            setMessage(msg);
            setIsError(true);
        }
    };

    return (
        <div className="relative min-h-[100dvh] w-full overflow-auto">
            <div className="fixed inset-0 bg-[url('/assets/bgHome.png')] bg-cover bg-center bg-no-repeat blur-sm" aria-hidden="true"></div>
            <div className="relative z-10 min-h-[100dvh] flex justify-center items-center px-4 py-8">
                <div className="bg-[#f5f0e8]/90 border-4 border-[#2b2b2b] px-6 py-8 min-[481px]:px-10 min-[481px]:py-12 text-center shadow-[6px_6px_0_#2b2b2b] w-[min(92vw,46rem)] flex flex-col items-center">
                    <h1 className="hb-title font-arcade tracking-widest text-[#1f2937] mb-6">{t("Save Data")}</h1>
                    <p className="text-sm text-[#1f2937] mb-6 max-w-md">
                        {t("Request an export of your personal data. You will receive a download link by email.")}
                    </p>
                    <form className="bg-white p-6 rounded-lg shadow-md w-full max-w-md mx-auto flex flex-col justify-center gap-4">
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="export-email">
                                {t("Email")}
                            </label>
                            <input
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                id="export-email"
                                type="email"
                                placeholder={t("Your email")}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
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
                                <option value="csv">CSV</option>
                            </select>
                        </div>
                        <div className="mb-2 flex items-center justify-between">
                            <button
                                className="hb-tap font-arcade cursor-pointer px-6 py-3 text-xl min-[481px]:text-3xl text-black bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 rounded-lg transition-all duration-200 translate-button transform hover:scale-105 shadow-lg hover:shadow-xl w-full max-w-xs flex justify-center items-center"
                                type="button"
                                onClick={handleSave}
                            >
                                {t("Request Export")}
                            </button>
                        </div>
                        <div className="text-xs text-[#1f2937]/80">
                            {t("We will notify you when the export is ready.")}
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