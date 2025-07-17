import { createSlice } from "@reduxjs/toolkit";
import { RootState } from "./store";

// Definisci il tipo di stato per l'autenticazione


interface AuthState {
    isLoggedIn: boolean;
}

// Stato iniziale
const initialState: AuthState = {
    isLoggedIn: !!localStorage.getItem('currentUser'),
};

// Crea lo slice dell'autenticazione
const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {

        login: (state) => {
            state.isLoggedIn = true;
        },

        logout: (state) => {
            state.isLoggedIn = false;
            localStorage.removeItem('currentUser');
        },
    },
});

export const { login, logout } = authSlice.actions;
export const selectIsLoggedIn = (state : RootState) => state.user;
export default authSlice.reducer;
