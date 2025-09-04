import axios from "axios";
import toaster from "./Toaster";

const logout = async () => {
  try {
    await axios.get("/api/auth/logout");
    return location.reload();
  } catch (error) {
    console.log(error);
    toaster("error", "Проблемы с сетью!");
  }
};

export default logout;
