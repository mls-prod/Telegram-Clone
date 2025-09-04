import toaster from "./Toaster";

const copyText = async (text: string) => {
  if ("clipboard" in navigator) {
    await navigator.clipboard.writeText(text);
  } else {
    toaster("error", "Копирование не поддерживается в вашем браузере.");
  }
};

export default copyText;
