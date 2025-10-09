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
          "flex-col gap-8 p-8 min-h-screen dark:bg-gradient-to-br dark:from-gray-900 dark:via-indigo-900 dark:to-blue-900 flex items-center justify-center"
        }
      >
        {children}
      </section>
    </SidebarMenuWrapper>
  );
}
