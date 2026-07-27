import Cookies from "js-cookie";
import { DEMO_MODE_COOKIE_KEY } from "@/app/consts";
import { isBrowser } from "@/lib/utils";

export const demoCookies = Cookies.withAttributes({ path: "/", sameSite: "lax" });

export const getInitialDemoMode = () => {
  return isBrowser() && demoCookies.get(DEMO_MODE_COOKIE_KEY) === "true";
};
