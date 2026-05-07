import { Link } from "react-router-dom";

const TermsOfService = () => {
    return (
        <div className="min-h-[100dvh] bg-[#e9eff7] px-4 py-10 text-[#1f2937]">
            <div className="mx-auto w-full max-w-4xl rounded-2xl border-4 border-[#2b2b2b] bg-white/90 p-6 shadow-[8px_8px_0_#2b2b2b] min-[481px]:p-10">
                <p className="mb-4 text-sm uppercase tracking-[0.22em] text-[#4b5563]">Terms of Service</p>
                <h1 className="mb-6 text-3xl font-bold min-[481px]:text-5xl">Rules for using ft_transcendence</h1>
                <div className="space-y-5 text-sm leading-7 min-[481px]:text-base">
                    <p>
                        By using ft_transcendence, you agree to use the platform for lawful and respectful social
                        interaction. Harassment, abuse, spam, and attempts to bypass security controls are not
                        allowed.
                    </p>
                    <p>
                        You are responsible for the content you upload and send, including profile data, avatars,
                        and chat messages. Do not submit illegal, infringing, or harmful content.
                    </p>
                    <p>
                        The service may limit or block requests to protect availability, security, and fair use.
                        Real-time features depend on network connectivity and may be temporarily unavailable.
                    </p>
                    <p>
                        Account deletion will remove your account data according to the project cleanup flows. Some
                        operational records may remain for security, audit, or integrity reasons where needed.
                    </p>
                    <p>
                        The project is provided for educational and demonstration purposes. No warranty is given for
                        uninterrupted availability or absolute data permanence.
                    </p>
                    <p>
                        For more information about your data, visit the <Link className="font-semibold underline" to="/privacy-policy">Privacy Policy</Link>.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TermsOfService;
