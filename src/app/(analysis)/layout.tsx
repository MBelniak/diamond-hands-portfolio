import { SidebarMenuWrapper } from "@/components/SidebarMenuWrapper";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarMenuWrapper>
      <section
        className={"flex-col gap-8 p-8 min-h-screen light-gradient dark:dark-gradient flex items-center justify-center"}
      >
        {children}
      </section>
    </SidebarMenuWrapper>
  );
}
