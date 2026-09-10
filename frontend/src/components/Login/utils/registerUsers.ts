import { register } from "../../../backend/auth";

export const registerUser = async (
  email: string,
  password: string,
  displayName: string,
  extraData?: {
    cognome?: string;
    telefono?: string;
    corsoLaurea?: string;
    annoAccademico?: string;
  }
) => {
  return register({ email, password, displayName, ...extraData });
};
