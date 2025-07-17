import { ReactNode } from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import React from "react";
import { selectIsLoggedIn } from "./store/authslice"; // Assicurati che il path sia corretto

interface PrivateRouteProps {
    children: ReactNode
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
    const isAuthenticated = useSelector(selectIsLoggedIn);

    if(!isAuthenticated){
        return <Navigate to = "/" />;
    }
    
    return <>{children}</>;
};

export default PrivateRoute;