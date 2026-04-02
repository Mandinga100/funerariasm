import { ReactNode } from "react";
import NavbarPremium from "./NavbarPremium";
import FooterPremium from "./FooterPremium";
import WhatsAppFloat from "./WhatsAppFloat";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => (
  <div className="min-h-screen flex flex-col">
    <NavbarPremium />
    <main className="flex-1 animate-fade-in">{children}</main>
    <FooterPremium />
    <WhatsAppFloat />
  </div>
);

export default Layout;
