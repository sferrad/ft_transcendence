import { Link } from "react-router-dom";

const PrivacyPolicy = () => {
    return (
        <div className="min-h-[100dvh] bg-[#f5f0e8] px-4 py-10 text-[#1f2937]">
            <div className="mx-auto w-full max-w-4xl rounded-2xl border-4 border-[#2b2b2b] bg-white/90 p-6 shadow-[8px_8px_0_#2b2b2b] min-[481px]:p-10">
                <p className="mb-4 text-sm uppercase tracking-[0.22em] text-[#4b5563]">Privacy Policy</p>
                <h1 className="mb-6 text-3xl font-bold min-[481px]:text-5xl">How we handle your data</h1>
                <div className="space-y-5 text-sm leading-7 min-[481px]:text-base">
                    <p>
                        ft_transcendence collects only the data needed to operate the platform: account identifiers,
                        profile information, avatar uploads, friends relationships, chat history, game activity, and
                        export / deletion requests.
                    </p>
                    <p>
                        We use this information to authenticate users, display profiles, manage social features,
                        deliver realtime chat and gameplay, and provide data export and account deletion flows.
                    </p>
                    <p>
                        Uploaded avatars are validated server-side before storage. Sensitive credentials are not
                        stored in the frontend and are managed through Vault and server-side environment variables.
                    </p>
                    <p>
                        We do not sell personal data. Operational data is retained only as long as needed for the
                        service to function or until the user requests deletion, subject to legal and technical
                        constraints.
                    </p>
                    <p>
                        Users can request an export of their personal data from the application settings. They can
                        also delete their account, which triggers cleanup across the backend services.
                    </p>
                    <p>
                        If you need to review the application again, return to the <Link className="font-semibold underline" to="/">home page</Link>.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
