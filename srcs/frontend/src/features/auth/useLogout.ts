import { useNavigate } from "react-router-dom";
import { closeSocket } from "../../hooks/socketSingleton";

export const useLogout = () => {
    const navigate = useNavigate();

    const disconnect = () => {
        closeSocket();
        localStorage.removeItem("access_token");
        localStorage.removeItem("username");
        localStorage.removeItem("email");
        localStorage.removeItem("user_id");
        navigate("/");
        window.location.reload();
    };

    return { disconnect };
};
