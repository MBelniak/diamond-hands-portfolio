import { SidebarMenuWrapper } from "@/components/SidebarMenuWrapper";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarMenuWrapper>
      <section
        className={
          "flex-col gap-8 p-8 min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-blue-900 flex items-center justify-center"
        }
      >
        {children}
      </section>
    </SidebarMenuWrapper>
  );
}
