import { SidebarMenuWrapper } from "@/components/SidebarMenuWrapper";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <SidebarMenuWrapper>{children}</SidebarMenuWrapper>;
}
